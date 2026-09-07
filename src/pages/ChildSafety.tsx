import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ShieldCheck, AlertTriangle, Mail, Scale, Users } from "lucide-react";
import { Helmet } from "react-helmet-async";

const ChildSafety = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Child Safety Standards | SwishView</title>
        <meta name="description" content="SwishView's Child Safety Standards outline our zero-tolerance policy on child sexual abuse and exploitation (CSAE), reporting mechanisms, and compliance with global safety laws." />
        <link rel="canonical" href="https://www.swishview.com/child-safety" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Child Safety Standards</h1>
            </div>

            <div className="bg-card rounded-lg shadow-sm p-6 md:p-8 space-y-8 text-card-foreground leading-relaxed">

              {/* Introduction */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  <ShieldCheck className="h-6 w-6 shrink-0" />
                  <h2 className="text-xl font-semibold">Our Commitment to Child Safety</h2>
                </div>
                <p className="text-muted-foreground">
                  SwishView is deeply committed to the safety and well-being of all users, with a particular focus on protecting minors. We maintain a strict zero-tolerance policy against any form of Child Sexual Abuse and Exploitation (CSAE). Any content, behaviour, or activity that endangers children is absolutely prohibited on our platform.
                </p>
              </section>

              {/* Zero Tolerance Policy */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-6 w-6 shrink-0" />
                  <h2 className="text-xl font-semibold">Zero-Tolerance CSAE Policy</h2>
                </div>
                <p className="text-muted-foreground">
                  SwishView enforces a zero-tolerance policy regarding Child Sexual Abuse and Exploitation (CSAE). The following activities are strictly prohibited on our platform:
                </p>
                <ul className="list-disc ml-6 space-y-2 text-muted-foreground">
                  <li>Uploading, sharing, distributing, or promoting any content that depicts, encourages, or facilitates child sexual abuse or exploitation in any form.</li>
                  <li>Using the platform to groom, solicit, or exploit minors in any way.</li>
                  <li>Sharing or requesting child sexual abuse material (CSAM), including images, videos, text, or illustrations.</li>
                  <li>Creating, promoting, or distributing content that sexualises minors, even in fictional or AI-generated formats.</li>
                  <li>Any activity that endangers, harms, or threatens the safety of a child.</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground pt-2">Enforcement Actions</h3>
                <p className="text-muted-foreground">
                  Violations of this policy result in immediate and permanent enforcement actions, including but not limited to:
                </p>
                <ul className="list-disc ml-6 space-y-2 text-muted-foreground">
                  <li>Immediate removal of all offending content without prior notice.</li>
                  <li>Permanent suspension and termination of the violating account.</li>
                  <li>Reporting to relevant law enforcement agencies and organisations such as the National Center for Missing & Exploited Children (NCMEC).</li>
                  <li>Preservation of evidence for law enforcement investigations.</li>
                </ul>
              </section>

              {/* Reporting */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  <Mail className="h-6 w-6 shrink-0" />
                  <h2 className="text-xl font-semibold">Reporting Harmful Content</h2>
                </div>
                <p className="text-muted-foreground">
                  If you encounter any content on SwishView that you believe involves child sexual abuse, exploitation, or any activity that endangers a minor, we urge you to report it immediately. Every report is treated with the highest priority and confidentiality.
                </p>

                <h3 className="text-lg font-medium text-foreground pt-2">How to Report</h3>
                <ul className="list-disc ml-6 space-y-2 text-muted-foreground">
                  <li>
                    <strong>Email:</strong> Send a detailed report to{" "}
                    <a href="mailto:support@swishview.com" className="text-primary underline font-medium">support@swishview.com</a>{" "}
                    with the subject line "Child Safety Report".
                  </li>
                  <li>Include any relevant details such as the content URL, user profile, screenshots, and a description of the violation.</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground pt-2">Our Response Commitment</h3>
                <ul className="list-disc ml-6 space-y-2 text-muted-foreground">
                  <li>All child safety reports are reviewed within 24 hours of submission.</li>
                  <li>Confirmed violations result in immediate content removal and account action.</li>
                  <li>We cooperate fully with law enforcement authorities on all confirmed CSAE cases.</li>
                  <li>Reporters are kept informed of the outcome where legally permissible.</li>
                </ul>
              </section>

              {/* Compliance */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  <Scale className="h-6 w-6 shrink-0" />
                  <h2 className="text-xl font-semibold">Legal Compliance</h2>
                </div>
                <p className="text-muted-foreground">
                  SwishView operates in full compliance with applicable global child safety laws and regulations, including:
                </p>
                <ul className="list-disc ml-6 space-y-2 text-muted-foreground">
                  <li>Google Play Store's Child Safety and CSAE policies.</li>
                  <li>The Children's Online Privacy Protection Act (COPPA).</li>
                  <li>The Protection of Children from Sexual Offences Act (POCSO), where applicable.</li>
                  <li>International laws governing child protection and online safety.</li>
                </ul>
                <p className="text-muted-foreground">
                  We actively cooperate with law enforcement agencies, government bodies, and child safety organisations worldwide. When required by law or when we identify potential criminal activity involving minors, we promptly report such incidents to the appropriate authorities and provide all necessary evidence and assistance.
                </p>
              </section>

              {/* User Safety */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  <Users className="h-6 w-6 shrink-0" />
                  <h2 className="text-xl font-semibold">User Safety Commitment</h2>
                </div>
                <p className="text-muted-foreground">
                  SwishView employs a range of proactive measures to ensure the safety of all users, with special emphasis on protecting minors:
                </p>
                <ul className="list-disc ml-6 space-y-2 text-muted-foreground">
                  <li>Continuous platform monitoring for policy violations and harmful content.</li>
                  <li>Automated and manual content review processes to detect and remove prohibited material.</li>
                  <li>Regular policy reviews and updates to align with evolving safety standards and regulations.</li>
                  <li>Staff training on child safety, CSAE identification, and proper reporting procedures.</li>
                  <li>Collaboration with industry partners and child safety organisations to strengthen our safety practices.</li>
                </ul>
              </section>

              {/* Contact */}
              <section className="space-y-3 border-t border-border pt-6">
                <h2 className="text-xl font-semibold text-foreground">Contact Us</h2>
                <p className="text-muted-foreground">
                  For any questions, concerns, or reports related to child safety on SwishView, please contact us at:
                </p>
                <p className="text-muted-foreground">
                  <strong>Email:</strong>{" "}
                  <a href="mailto:support@swishview.com" className="text-primary underline font-medium">support@swishview.com</a>
                </p>
                <p className="text-muted-foreground text-sm pt-2">
                  Last updated: April 2026
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChildSafety;
