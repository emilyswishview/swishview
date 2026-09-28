import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { paymentId, email } = body || {};

    const key = Deno.env.get("STRIPE_SECRET_KEY");
    if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(key, { apiVersion: "2023-10-16" });

    // ===== Email lookup mode =====
    if (email && typeof email === "string") {
      const emailTrim = email.trim().toLowerCase();
      if (!emailTrim) throw new Error("email is empty");

      const quote = (value: string) => `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
      const customerIdOf = (value: any) => typeof value === "string" ? value : value?.id;
      const addToMap = <T extends { id?: string }>(map: Map<string, T>, item: T | null | undefined) => {
        if (item?.id) map.set(item.id, item);
      };
      const searchStripe = async (resource: any, queries: string[]) => {
        const rows: any[] = [];
        for (const query of queries) {
          try {
            const res = await resource.search({ query, limit: 100 });
            rows.push(...(res.data || []));
          } catch (err) {
            console.warn("Stripe search skipped", query, (err as Error).message);
          }
        }
        return rows;
      };

      const customersById = new Map<string, any>();
      const paymentIntentsById = new Map<string, any>();
      const chargesById = new Map<string, any>();
      const subscriptionsById = new Map<string, any>();
      const invoicesById = new Map<string, any>();
      const checkoutSessionsById = new Map<string, any>();

      // Stripe's customer list only matches the Customer.email field. Some payments
      // only store the buyer email on the Charge, PaymentIntent, or Invoice, so search
      // those resources directly too.
      const exactCustomers = await stripe.customers.list({ email: emailTrim, limit: 100 }).catch(() => ({ data: [] as any[] }));
      exactCustomers.data.forEach((c: any) => addToMap(customersById, c));
      const searchedCustomers = await searchStripe(stripe.customers, [`email:${quote(emailTrim)}`]);
      searchedCustomers.forEach((c: any) => addToMap(customersById, c));

      // Stripe Search API supports `receipt_email` on charges (not on PI/Invoices),
      // so use it to catch charges whose Stripe Customer has a different/no email.
      const [searchedCharges, searchedPaymentIntents, searchedInvoices] = await Promise.all([
        searchStripe(stripe.charges, [`receipt_email:${quote(emailTrim)}`]),
        Promise.resolve([] as any[]),
        Promise.resolve([] as any[]),
      ]);

      searchedCharges.forEach((c: any) => addToMap(chargesById, c));
      searchedPaymentIntents.forEach((p: any) => addToMap(paymentIntentsById, p));
      searchedInvoices.forEach((i: any) => addToMap(invoicesById, i));

      const discoveredCustomerIds = new Set<string>();
      [...searchedCharges, ...searchedPaymentIntents, ...searchedInvoices].forEach((item: any) => {
        const cid = customerIdOf(item.customer);
        if (cid) discoveredCustomerIds.add(cid);
      });

      for (const customerId of discoveredCustomerIds) {
        if (!customersById.has(customerId)) {
          try { addToMap(customersById, await stripe.customers.retrieve(customerId)); } catch {}
        }
      }

      for (const pi of searchedPaymentIntents) {
        const latestChargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
        if (latestChargeId && !chargesById.has(latestChargeId)) {
          try { addToMap(chargesById, await stripe.charges.retrieve(latestChargeId)); } catch {}
        }
      }

      for (const inv of searchedInvoices) {
        const paymentIntentId = typeof inv.payment_intent === "string" ? inv.payment_intent : inv.payment_intent?.id;
        if (paymentIntentId && !paymentIntentsById.has(paymentIntentId)) {
          try {
            const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
            addToMap(paymentIntentsById, pi);
            const latestChargeId = typeof (pi as any).latest_charge === "string" ? (pi as any).latest_charge : (pi as any).latest_charge?.id;
            if (latestChargeId && !chargesById.has(latestChargeId)) addToMap(chargesById, await stripe.charges.retrieve(latestChargeId));
          } catch {}
        }
      }

      const customers = Array.from(customersById.values());

      const out: any = {
        kind: "email_lookup",
        email: emailTrim,
        customers: [] as any[],
        paymentIntents: [] as any[],
        charges: [] as any[],
        subscriptions: [] as any[],
        invoices: [] as any[],
        checkoutSessions: [] as any[],
      };

      for (const cust of customers) {
        const [pis, chs, subs, invs, sessions] = await Promise.all([
          stripe.paymentIntents.list({ customer: cust.id, limit: 100 }).catch(() => ({ data: [] as any[] })),
          stripe.charges.list({ customer: cust.id, limit: 100 }).catch(() => ({ data: [] as any[] })),
          stripe.subscriptions.list({ customer: cust.id, limit: 100, status: "all" as any }).catch(() => ({ data: [] as any[] })),
          stripe.invoices.list({ customer: cust.id, limit: 100 }).catch(() => ({ data: [] as any[] })),
          stripe.checkout.sessions.list({ customer: cust.id, limit: 100 }).catch(() => ({ data: [] as any[] })),
        ]);

        pis.data.forEach((p: any) => addToMap(paymentIntentsById, p));
        chs.data.forEach((c: any) => addToMap(chargesById, c));
        subs.data.forEach((s: any) => addToMap(subscriptionsById, s));
        invs.data.forEach((i: any) => addToMap(invoicesById, i));
        sessions.data.forEach((s: any) => addToMap(checkoutSessionsById, s));
      }

      if (customersById.size === 0 || chargesById.size === 0) {
        const maxScan = Math.max(100, Math.min(Number(body?.scanLimit) || 5000, 10000));
        let scanned = 0;
        let startingAfter: string | undefined;
        while (scanned < maxScan) {
          const page: any = await stripe.charges.list({ limit: Math.min(100, maxScan - scanned), ...(startingAfter ? { starting_after: startingAfter } : {}) });
          for (const charge of page.data || []) {
            const billingEmail = charge.billing_details?.email?.toLowerCase?.();
            const receiptEmail = charge.receipt_email?.toLowerCase?.();
            if (billingEmail === emailTrim || receiptEmail === emailTrim) {
              addToMap(chargesById, charge);
              const cid = customerIdOf(charge.customer);
              if (cid && !customersById.has(cid)) {
                try { addToMap(customersById, await stripe.customers.retrieve(cid)); } catch {}
              }
              const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
              if (piId && !paymentIntentsById.has(piId)) {
                try { addToMap(paymentIntentsById, await stripe.paymentIntents.retrieve(piId)); } catch {}
              }
            }
          }
          scanned += page.data?.length || 0;
          if (!page.has_more || !page.data?.length) break;
          startingAfter = page.data[page.data.length - 1].id;
        }

        scanned = 0;
        startingAfter = undefined;
        while (scanned < maxScan) {
          const page: any = await stripe.checkout.sessions.list({ limit: Math.min(100, maxScan - scanned), ...(startingAfter ? { starting_after: startingAfter } : {}) });
          for (const session of page.data || []) {
            const sessionEmail = session.customer_details?.email?.toLowerCase?.() || session.customer_email?.toLowerCase?.();
            if (sessionEmail === emailTrim) {
              addToMap(checkoutSessionsById, session);
              const cid = customerIdOf(session.customer);
              if (cid && !customersById.has(cid)) {
                try { addToMap(customersById, await stripe.customers.retrieve(cid)); } catch {}
              }
              const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
              if (piId && !paymentIntentsById.has(piId)) {
                try {
                  const pi = await stripe.paymentIntents.retrieve(piId);
                  addToMap(paymentIntentsById, pi);
                  const latestChargeId = typeof (pi as any).latest_charge === "string" ? (pi as any).latest_charge : (pi as any).latest_charge?.id;
                  if (latestChargeId && !chargesById.has(latestChargeId)) addToMap(chargesById, await stripe.charges.retrieve(latestChargeId));
                } catch {}
              }
            }
          }
          scanned += page.data?.length || 0;
          if (!page.has_more || !page.data?.length) break;
          startingAfter = page.data[page.data.length - 1].id;
        }
      }

      out.customers = Array.from(customersById.values()).map((c: any) => ({
        id: c.id, email: c.email, name: c.name, phone: c.phone,
        created: c.created, currency: c.currency, balance: c.balance,
        delinquent: c.delinquent, description: c.description,
      }));
      out.paymentIntents = Array.from(paymentIntentsById.values()).map((p: any) => ({
        id: p.id, customerId: customerIdOf(p.customer), amount: p.amount, currency: p.currency,
        status: p.status, created: p.created, description: p.description,
        receiptEmail: p.receipt_email, latestCharge: p.latest_charge, invoice: p.invoice,
        metadata: p.metadata,
      }));
      out.charges = Array.from(chargesById.values()).map((c: any) => ({
        id: c.id, customerId: customerIdOf(c.customer), amount: c.amount, amountRefunded: c.amount_refunded,
        currency: c.currency, status: c.status, paid: c.paid, refunded: c.refunded,
        created: c.created, description: c.description, receiptUrl: c.receipt_url,
        paymentIntent: c.payment_intent, invoice: c.invoice,
        card: c.payment_method_details?.card ? {
          brand: c.payment_method_details.card.brand,
          last4: c.payment_method_details.card.last4,
          country: c.payment_method_details.card.country,
        } : null,
        billing: c.billing_details, metadata: c.metadata,
      }));
      out.subscriptions = Array.from(subscriptionsById.values()).map((s: any) => ({
        id: s.id, customerId: customerIdOf(s.customer), status: s.status,
        currentPeriodStart: s.current_period_start, currentPeriodEnd: s.current_period_end,
        cancelAtPeriodEnd: s.cancel_at_period_end, canceledAt: s.canceled_at,
        created: s.created, latestInvoice: s.latest_invoice,
        items: s.items?.data?.map((i: any) => ({
          id: i.id, priceId: i.price?.id, productId: i.price?.product,
          amount: i.price?.unit_amount, currency: i.price?.currency,
          interval: i.price?.recurring?.interval, quantity: i.quantity,
        })) ?? [],
      }));
      out.invoices = Array.from(invoicesById.values()).map((i: any) => ({
        id: i.id, customerId: customerIdOf(i.customer), number: i.number, status: i.status,
        total: i.total, amountPaid: i.amount_paid, amountDue: i.amount_due,
        currency: i.currency, created: i.created,
        periodStart: i.period_start, periodEnd: i.period_end,
        hostedUrl: i.hosted_invoice_url, pdf: i.invoice_pdf,
        subscription: i.subscription, paymentIntent: i.payment_intent,
      }));
      out.checkoutSessions = Array.from(checkoutSessionsById.values()).map((s: any) => ({
        id: s.id, customerId: customerIdOf(s.customer), mode: s.mode, paymentStatus: s.payment_status,
        amountTotal: s.amount_total, currency: s.currency, created: s.created,
        url: s.url, paymentIntent: s.payment_intent, subscription: s.subscription,
      }));

      // Sort newest first
      const byCreated = (a: any, b: any) => (b.created || 0) - (a.created || 0);
      out.paymentIntents.sort(byCreated);
      out.charges.sort(byCreated);
      out.subscriptions.sort(byCreated);
      out.invoices.sort(byCreated);
      out.checkoutSessions.sort(byCreated);

      const totals = {
        customers: customers.length,
        paymentIntents: out.paymentIntents.length,
        charges: out.charges.length,
        subscriptions: out.subscriptions.length,
        invoices: out.invoices.length,
        checkoutSessions: out.checkoutSessions.length,
        grossPaid: out.charges.filter((c: any) => c.paid && c.status === "succeeded").reduce((s: number, c: any) => s + (c.amount || 0), 0),
        totalRefunded: out.charges.reduce((s: number, c: any) => s + (c.amountRefunded || 0), 0),
        currency: out.charges[0]?.currency || out.paymentIntents[0]?.currency || "usd",
      };
      out.totals = totals;

      return new Response(JSON.stringify(out), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ===== Single ID mode =====
    if (!paymentId || typeof paymentId !== "string") throw new Error("paymentId or email is required");
    const id = paymentId.trim();

    let kind = "";
    let session: any = null;
    let paymentIntent: any = null;
    let charge: any = null;
    let invoice: any = null;
    let customer: any = null;
    let subscription: any = null;
    let refunds: any[] = [];

    // Detect type by prefix
    if (id.startsWith("cs_")) {
      kind = "checkout_session";
      session = await stripe.checkout.sessions.retrieve(id, {
        expand: ["payment_intent", "payment_intent.charges", "customer", "subscription", "invoice", "line_items"],
      });
      paymentIntent = typeof session.payment_intent === "object" ? session.payment_intent : null;
      customer = typeof session.customer === "object" ? session.customer : null;
      subscription = typeof session.subscription === "object" ? session.subscription : null;
      invoice = typeof session.invoice === "object" ? session.invoice : null;
    } else if (id.startsWith("pi_")) {
      kind = "payment_intent";
      paymentIntent = await stripe.paymentIntents.retrieve(id, {
        expand: ["charges", "customer", "invoice", "latest_charge"],
      });
    } else if (id.startsWith("ch_") || id.startsWith("py_")) {
      kind = "charge";
      charge = await stripe.charges.retrieve(id, { expand: ["customer", "invoice", "payment_intent"] });
      paymentIntent = typeof charge.payment_intent === "object" ? charge.payment_intent : null;
    } else if (id.startsWith("in_")) {
      kind = "invoice";
      invoice = await stripe.invoices.retrieve(id, { expand: ["customer", "subscription", "payment_intent", "charge"] });
      paymentIntent = typeof invoice.payment_intent === "object" ? invoice.payment_intent : null;
    } else if (id.startsWith("sub_")) {
      kind = "subscription";
      subscription = await stripe.subscriptions.retrieve(id, { expand: ["customer", "latest_invoice", "default_payment_method"] });
      customer = typeof subscription.customer === "object" ? subscription.customer : null;
    } else if (id.startsWith("cus_")) {
      kind = "customer";
      customer = await stripe.customers.retrieve(id);
    } else {
      // Try payment intent fallback
      try {
        paymentIntent = await stripe.paymentIntents.retrieve(id);
        kind = "payment_intent";
      } catch {
        throw new Error(`Unrecognized Stripe id: ${id}`);
      }
    }

    // Resolve charge from PI
    if (!charge && paymentIntent) {
      const latestChargeId = (paymentIntent as any).latest_charge;
      if (typeof latestChargeId === "string") {
        try { charge = await stripe.charges.retrieve(latestChargeId); } catch {}
      } else if (paymentIntent.charges?.data?.length) {
        charge = paymentIntent.charges.data[0];
      }
    }

    // Resolve customer
    if (!customer) {
      const cid = (paymentIntent?.customer || charge?.customer || invoice?.customer) as string | undefined;
      if (cid && typeof cid === "string") {
        try { customer = await stripe.customers.retrieve(cid); } catch {}
      }
    }

    // Invoice from PI
    if (!invoice && paymentIntent?.invoice && typeof paymentIntent.invoice === "string") {
      try { invoice = await stripe.invoices.retrieve(paymentIntent.invoice); } catch {}
    }

    // Subscription from invoice
    if (!subscription && invoice?.subscription && typeof invoice.subscription === "string") {
      try { subscription = await stripe.subscriptions.retrieve(invoice.subscription); } catch {}
    }

    // Refunds
    if (charge?.id) {
      try {
        const r = await stripe.refunds.list({ charge: charge.id, limit: 20 });
        refunds = r.data;
      } catch {}
    }

    const summary = {
      kind,
      id,
      amount: (charge?.amount ?? paymentIntent?.amount ?? session?.amount_total ?? invoice?.amount_paid ?? null),
      amountRefunded: charge?.amount_refunded ?? 0,
      currency: (charge?.currency ?? paymentIntent?.currency ?? session?.currency ?? invoice?.currency ?? "usd"),
      status: charge?.status ?? paymentIntent?.status ?? session?.payment_status ?? invoice?.status ?? subscription?.status ?? null,
      created: charge?.created ?? paymentIntent?.created ?? session?.created ?? invoice?.created ?? customer?.created ?? null,
      description: charge?.description ?? paymentIntent?.description ?? invoice?.description ?? null,
      receiptUrl: charge?.receipt_url ?? null,
      receiptEmail: charge?.receipt_email ?? paymentIntent?.receipt_email ?? session?.customer_details?.email ?? null,
      paymentMethod: charge?.payment_method_details ?? null,
      billingDetails: charge?.billing_details ?? session?.customer_details ?? null,
      metadata: paymentIntent?.metadata ?? charge?.metadata ?? session?.metadata ?? {},
      customer: customer ? {
        id: customer.id, email: customer.email, name: customer.name, phone: customer.phone,
        created: customer.created, currency: customer.currency, balance: customer.balance,
      } : null,
      invoice: invoice ? {
        id: invoice.id, number: invoice.number, hostedUrl: invoice.hosted_invoke_url || invoice.hosted_invoice_url,
        pdf: invoice.invoice_pdf, status: invoice.status, total: invoice.total, amountPaid: invoice.amount_paid,
        amountDue: invoice.amount_due, periodStart: invoice.period_start, periodEnd: invoice.period_end,
      } : null,
      subscription: subscription ? {
        id: subscription.id, status: subscription.status,
        currentPeriodStart: subscription.current_period_start, currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end, canceledAt: subscription.canceled_at,
        items: subscription.items?.data?.map((i: any) => ({
          id: i.id, priceId: i.price?.id, productId: i.price?.product,
          amount: i.price?.unit_amount, currency: i.price?.currency, interval: i.price?.recurring?.interval, quantity: i.quantity,
        })) ?? [],
      } : null,
      checkoutSession: session ? {
        id: session.id, mode: session.mode, paymentStatus: session.payment_status,
        amountTotal: session.amount_total, amountSubtotal: session.amount_subtotal,
        currency: session.currency, url: session.url, successUrl: session.success_url,
      } : null,
      refunds: refunds.map(r => ({ id: r.id, amount: r.amount, currency: r.currency, status: r.status, reason: r.reason, created: r.created })),
      raw: { paymentIntent, charge, session, invoice, subscription },
    };

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("stripe-payment-details error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
