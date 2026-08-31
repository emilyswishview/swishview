import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as Stripe.Checkout.Session;

      const campaignId = session.metadata?.campaignId;
      const userId = session.metadata?.userId;
      const serviceType = session.metadata?.serviceType;
      const planId = session.metadata?.planId;
      const auditSubmissionId = session.metadata?.auditSubmissionId;
      const auditEmail = session.metadata?.email;
      const auditChannelUrl = session.metadata?.channelUrl;

      // Handle instant audit service (no userId required)
      if (serviceType === 'instant_audit' && auditSubmissionId) {
        try {
          console.log(`Processing instant audit payment for submission ${auditSubmissionId}`);

          // Update audit submission status
          const { error: auditUpdateError } = await supabase
            .from("audit_submissions")
            .update({
              status: "completed",
              stripe_payment_intent_id: session.payment_intent as string,
              updated_at: new Date().toISOString()
            })
            .eq("id", auditSubmissionId);

          if (auditUpdateError) {
            console.error("Error updating audit submission:", auditUpdateError);
          }

          // Send confirmation email
          if (auditEmail) {
            try {
              await resend.emails.send({
                from: "SwishView <noreply@swishview.com>",
                to: [auditEmail],
                subject: "Your SwishView Channel Audit is on the way",
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <h1 style="color: #f97316; font-size: 28px; margin: 0;">SwishView</h1>
                      <p style="color: #666; margin: 5px 0;">YouTube Growth Platform</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                      <h2 style="color: #333; margin-top: 0;">Payment Successful! 🎉</h2>
                      <p style="color: #666; line-height: 1.6;">
                        Thank you for purchasing our YouTube Channel Audit!
                      </p>
                      
                      <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
                        <p style="margin: 0; color: #333;"><strong>Channel:</strong> ${auditChannelUrl}</p>
                        <p style="margin: 5px 0 0 0; color: #333;"><strong>Amount Paid:</strong> $${((session.amount_total || 0) / 100).toFixed(2)}</p>
                      </div>
                      
                      <p style="color: #666; line-height: 1.6;">
                        You will be assigned a <strong>YouTube Growth Expert</strong> who'll personally review your channel 
                        and share a detailed report with a clear roadmap to grow your channel faster and more effectively.
                      </p>

                      <p style="color: #666; line-height: 1.6;">
                        <strong>What to expect:</strong>
                      </p>
                      <ul style="color: #666; line-height: 1.8;">
                        <li>Review of your channel's current performance and structure</li>
                        <li>Analysis of recent videos and engagement trends</li>
                        <li>Insights on how YouTube's algorithm reads your content</li>
                        <li>Audience and discovery review to reveal growth gaps</li>
                        <li>Personalized improvement report delivered within 7 days</li>
                      </ul>

                      <p style="color: #666; line-height: 1.6;">
                        Your personalized audit report will be delivered to this email within 7 business days.
                      </p>
                    </div>
                    
                    <div style="text-align: center; padding: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
                      <p>Thank you for choosing SwishView!</p>
                      <p>Questions? Contact us at support@swishview.com</p>
                    </div>
                  </div>
                `,
              });
              console.log("Audit confirmation email sent to:", auditEmail);
            } catch (emailError) {
              console.error("Error sending audit confirmation email:", emailError);
            }
          }

          console.log(`Instant audit payment processed for submission ${auditSubmissionId}`);
        } catch (error) {
          console.error("Error processing instant audit payment:", error);
        }
      } else if (userId) {
        try {
          let campaign = null;
          let seoPlan = null;
          
          // Handle different service types
          if (serviceType === 'seo_optimization' && planId) {
            // SEO Plan purchase
            const { data: seoData, error: seoError } = await supabase
              .from("seo_plans")
              .select("*")
              .eq("id", planId)
              .single();

            if (seoError || !seoData) {
              console.error("Error fetching SEO plan details:", seoError);
            } else {
              seoPlan = seoData;
            }
          } else if (campaignId) {
            // Campaign purchase
            const { data: campaignData, error: fetchError } = await supabase
              .from("campaigns")
              .select("title, youtube_video_url")
              .eq("id", campaignId)
              .single();

            if (fetchError || !campaignData) {
              console.error("Error fetching campaign details:", fetchError);
            } else {
              campaign = campaignData;
            }
          }

          // 🔽 Fetch user profile for email
          const { data: userProfile, error: userError } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", userId)
            .single();

          if (userError) {
            console.error("Error fetching user profile:", userError);
          }

          // 🔽 Create Stripe invoice
          let invoiceData = null;
          try {
            // Create Stripe customer if not exists
            const customers = await stripe.customers.list({ 
              email: userProfile?.email,
              limit: 1 
            });

            let customerId;
            if (customers.data.length > 0) {
              customerId = customers.data[0].id;
            } else {
              const customer = await stripe.customers.create({
                email: userProfile?.email,
                name: userProfile?.full_name,
              });
              customerId = customer.id;
            }

            // Create invoice
            const invoice = await stripe.invoices.create({
              customer: customerId,
              collection_method: 'charge_automatically',
              auto_advance: true,
              description: seoPlan ? `SwishView SEO Plan: ${seoPlan.name}` : `SwishView Campaign: ${campaign?.title}`,
              metadata: {
                campaignId: campaignId || '',
                userId,
                serviceType: serviceType || 'campaign',
                planId: planId || '',
              },
            });

            // Add invoice item
            await stripe.invoiceItems.create({
              customer: customerId,
              invoice: invoice.id,
              amount: session.amount_total || 0,
              currency: 'usd',
              description: seoPlan ? `SEO Optimization Plan: ${seoPlan.name}` : `Video Promotion Campaign: ${campaign?.title}`,
            });

            // Finalize and pay invoice
            const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
            await stripe.invoices.pay(finalizedInvoice.id);

            invoiceData = {
              id: finalizedInvoice.id,
              url: finalizedInvoice.hosted_invoice_url,
              pdf: finalizedInvoice.invoice_pdf,
            };

            console.log("Stripe invoice created:", invoiceData);
          } catch (invoiceError) {
            console.error("Error creating Stripe invoice:", invoiceError);
          }

          // Handle different payment types
          let paymentRecord = null;
          
          if (serviceType === 'seo_optimization' && planId) {
            // Update SEO purchase status
            const { data: updatedPurchase, error: updateError } = await supabase
              .from("seo_purchases")
              .update({ 
                status: "completed",
                updated_at: new Date().toISOString()
              })
              .eq("stripe_session_id", session.id)
              .select()
              .single();

            if (updateError) {
              console.error("SEO purchase update error:", updateError);
            } else {
              paymentRecord = updatedPurchase;
              
              // Generate coupon for SEO purchase
              try {
                await supabase.functions.invoke('generate-coupon', {
                  body: {
                    userId: userId,
                    seoPurchaseId: updatedPurchase.id,
                    amount: 250
                  }
                });
              } catch (couponError) {
                console.error("Error generating coupon:", couponError);
              }
            }
          } else if (campaignId) {
            // Insert campaign payment record
            const { data: insertedPayment, error: paymentError } = await supabase
              .from("payments")
              .insert([{
                campaign_id: campaignId,
                user_id: userId,
                amount: (session.amount_total || 0) / 100,
                status: "completed",
                stripe_payment_intent_id: session.payment_intent as string,
                stripe_invoice_id: invoiceData?.id || null,
                invoice_url: invoiceData?.url || null,
                invoice_pdf_url: invoiceData?.pdf || null,
                campaign_title: campaign?.title || null,
                youtube_video_title: campaign?.youtube_video_url || null,
                created_at: new Date().toISOString(),
              }])
              .select()
              .single();

            if (paymentError) {
              console.error("Payment insert error:", paymentError);
            } else {
              paymentRecord = insertedPayment;
            }
          }

          // 🔽 Create notification for user
          if (paymentRecord) {
            const { error: notificationError } = await supabase
              .from("notifications")
              .insert([{
                user_id: userId,
                title: "Payment Successful! 🎉",
                message: seoPlan 
                  ? `Your payment for SEO plan "${seoPlan.name}" has been processed successfully. Your plan is now active!`
                  : `Your payment for "${campaign?.title}" has been processed successfully. Your campaign is now active!`,
                type: "success",
                payment_id: paymentRecord?.id || null,
                created_at: new Date().toISOString(),
              }]);

            if (notificationError) {
              console.error("Notification insert error:", notificationError);
            }
          }

          // 🔽 Send email with invoice (if available)
          if (userProfile?.email && invoiceData?.pdf) {
            try {
              await resend.emails.send({
                from: "SwishView <noreply@swishview.com>",
                to: [userProfile.email],
                subject: seoPlan 
                  ? `Payment Confirmation - SEO Plan: ${seoPlan.name}`
                  : `Payment Confirmation - Campaign: ${campaign?.title}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <h1 style="color: #f97316; font-size: 28px; margin: 0;">SwishView</h1>
                      <p style="color: #666; margin: 5px 0;">Video Promotion Platform</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                      <h2 style="color: #333; margin-top: 0;">Payment Successful! 🎉</h2>
                      <p style="color: #666; line-height: 1.6;">
                        Hi ${userProfile.full_name || 'there'},<br><br>
                        Your payment for ${seoPlan ? `the SEO plan "<strong>${seoPlan.name}</strong>"` : `the campaign "<strong>${campaign?.title}</strong>"`} has been processed successfully!
                      </p>
                      
                      <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
                        <p style="margin: 0; color: #333;"><strong>${seoPlan ? 'SEO Plan' : 'Campaign'}:</strong> ${seoPlan?.name || campaign?.title}</p>
                        <p style="margin: 5px 0 0 0; color: #333;"><strong>Amount:</strong> $${((session.amount_total || 0) / 100).toFixed(2)}</p>
                        ${seoPlan ? '<p style="margin: 5px 0 0 0; color: #333;"><strong>Duration:</strong> ' + seoPlan.duration_months + ' months</p>' : ''}
                      </div>
                      
                      <p style="color: #666; line-height: 1.6;">
                        ${seoPlan 
                          ? 'Your SEO optimization plan is now active. Our team will start optimizing your videos for maximum reach and discoverability. You\'ll also receive a $250 bonus coupon!'
                          : 'Your campaign is now active and we\'ll start promoting your video to reach your target audience.'
                        }
                        You can track your progress anytime in your dashboard.
                      </p>
                      
                      ${invoiceData?.url ? `<div style="text-align: center; margin: 20px 0;">
                        <a href="${invoiceData.url}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Invoice</a>
                      </div>` : ''}
                    </div>
                    
                    <div style="text-align: center; padding: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
                      <p>Thank you for choosing SwishView!</p>
                      <p>Questions? Contact us at support@swishview.com</p>
                    </div>
                  </div>
                `,
              });

              console.log("Email sent successfully to:", userProfile.email);
            } catch (emailError) {
              console.error("Error sending email:", emailError);
            }
          }

          // Update status based on service type
          if (campaignId) {
            const { error: campaignError } = await supabase
              .from("campaigns")
              .update({ status: "active" })
              .eq("id", campaignId);

            if (campaignError) {
              console.error("Campaign update error:", campaignError);
            }
            console.log(`Payment processed for campaign ${campaignId}`);
          } else if (planId) {
            console.log(`Payment processed for SEO plan ${planId}`);
          }
        } catch (error) {
          console.error("Error processing payment:", error);
        }
      }
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
