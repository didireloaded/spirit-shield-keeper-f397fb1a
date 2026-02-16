import { FileText, AlertTriangle, Shield, Users, Scale } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 to-transparent px-4 pt-8 pb-6">
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Terms of Service</h1>
          </div>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-NA')}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <Alert>
          <AlertTriangle className="w-5 h-5" />
          <AlertDescription>
            <strong>Important:</strong> By using Spirit Shield Keeper, you agree to these Terms of Service. 
            Please read them carefully. If you do not agree, do not use the app.
          </AlertDescription>
        </Alert>

        <Section icon={<FileText className="w-6 h-6" />} title="1. Acceptance of Terms">
          <p className="text-muted-foreground">
            These Terms of Service ("Terms") govern your access to and use of Spirit Shield Keeper 
            ("the App"). By creating an account or using the App, you agree to be bound by these Terms 
            and our Privacy Policy.
          </p>
        </Section>

        <Section icon={<AlertTriangle className="w-6 h-6" />} title="2. Emergency Services Disclaimer">
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="w-5 h-5" />
            <AlertDescription>
              <strong>CRITICAL:</strong> Spirit Shield Keeper is NOT a replacement for emergency services. 
              In a life-threatening emergency, ALWAYS call 10111 (Namibian Police) or 10177 (Ambulance) first.
            </AlertDescription>
          </Alert>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>The App provides community-based safety features and information sharing</li>
            <li>We do not guarantee immediate response or assistance</li>
            <li>The App depends on internet connectivity and may not work offline</li>
            <li>Location accuracy may vary</li>
            <li>We are not responsible for any harm that occurs while using or not using the App</li>
          </ul>
        </Section>

        <Section icon={<Users className="w-6 h-6" />} title="3. User Accounts and Eligibility">
          <SubSection title="Eligibility">
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You must be at least 13 years old to use the App</li>
              <li>If you are under 18, you must have parental permission</li>
              <li>You must provide accurate information</li>
              <li>One account per person</li>
            </ul>
          </SubSection>
          <SubSection title="Account Security">
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You are responsible for maintaining account security</li>
              <li>Keep your password confidential</li>
              <li>Notify us immediately of unauthorized access</li>
              <li>You are responsible for all activities under your account</li>
            </ul>
          </SubSection>
        </Section>

        <Section icon={<Shield className="w-6 h-6" />} title="4. Acceptable Use Policy">
          <SubSection title="You MAY:">
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Report genuine safety incidents</li>
              <li>Share accurate information</li>
              <li>Help verify legitimate reports</li>
              <li>Use the App for personal safety</li>
            </ul>
          </SubSection>
          <SubSection title="You MAY NOT:">
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Submit false reports or fake emergencies</li>
              <li>Harass, bully, or threaten other users</li>
              <li>Share others' personal information without consent</li>
              <li>Use profanity, hate speech, or discriminatory language</li>
              <li>Spam or flood the platform</li>
              <li>Impersonate others</li>
              <li>Use the App for illegal activities</li>
              <li>Attempt to hack or compromise the system</li>
              <li>Scrape or collect data without permission</li>
            </ul>
          </SubSection>
          <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mt-4">
            <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
              Violation of these rules may result in warnings, credibility score reduction, 
              temporary suspension, or permanent ban.
            </p>
          </div>
        </Section>

        <Section icon={<Shield className="w-6 h-6" />} title="5. Credibility System">
          <p className="text-muted-foreground mb-4">
            We use a credibility scoring system to maintain platform quality:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>All users start with a credibility score of 50/100</li>
            <li>Verified reports increase your score</li>
            <li>False reports decrease your score</li>
            <li>Users with low credibility may have limited features</li>
            <li>Scores below 10 may result in automatic suspension</li>
          </ul>
        </Section>

        <Section icon={<FileText className="w-6 h-6" />} title="6. Content and Intellectual Property">
          <SubSection title="Your Content">
            <p className="text-muted-foreground">
              You retain ownership of content you post. By posting, you grant us a worldwide, 
              non-exclusive, royalty-free license to use, display, and distribute your content 
              within the App.
            </p>
          </SubSection>
          <SubSection title="Our Content">
            <p className="text-muted-foreground">
              The App design, features, and functionality are owned by Spirit Shield Keeper and 
              protected by copyright and trademark laws.
            </p>
          </SubSection>
        </Section>

        <Section icon={<Scale className="w-6 h-6" />} title="7. Limitation of Liability">
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              <strong>IMPORTANT LEGAL NOTICE:</strong> Please read this section carefully.
            </AlertDescription>
          </Alert>
          <p className="text-muted-foreground mb-4">TO THE MAXIMUM EXTENT PERMITTED BY LAW:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>The App is provided "AS IS" without warranties of any kind</li>
            <li>We do not guarantee uninterrupted or error-free service</li>
            <li>We are not liable for any harm resulting from use of the App</li>
            <li>We are not liable for actions of other users</li>
            <li>We are not liable for inaccurate location data</li>
            <li>Total liability is limited to N$100 or the amount paid (whichever is greater)</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            Some jurisdictions do not allow these limitations, so they may not apply to you.
          </p>
        </Section>

        <Section icon={<Shield className="w-6 h-6" />} title="8. Indemnification">
          <p className="text-muted-foreground">
            You agree to indemnify and hold harmless Spirit Shield Keeper from any claims, damages, 
            or expenses arising from:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Your violation of these Terms</li>
            <li>Your violation of any law</li>
            <li>Your violation of others' rights</li>
            <li>Content you post</li>
          </ul>
        </Section>

        <Section icon={<AlertTriangle className="w-6 h-6" />} title="9. Termination">
          <p className="text-muted-foreground mb-4">We may suspend or terminate your account if:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>You violate these Terms</li>
            <li>You submit false reports</li>
            <li>Your credibility score drops below 10</li>
            <li>You engage in abusive behavior</li>
            <li>Required by law</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            You may delete your account at any time from the app settings.
          </p>
        </Section>

        <Section icon={<FileText className="w-6 h-6" />} title="10. Changes to Terms">
          <p className="text-muted-foreground">
            We may modify these Terms at any time. We will notify you of significant changes via 
            email or app notification. Continued use after changes constitutes acceptance.
          </p>
        </Section>

        <Section icon={<Scale className="w-6 h-6" />} title="11. Governing Law and Disputes">
          <p className="text-muted-foreground">
            These Terms are governed by the laws of the Republic of Namibia. Any disputes will be 
            resolved in the courts of Windhoek, Namibia.
          </p>
        </Section>

        <Card className="p-6 bg-primary/5">
          <h2 className="text-xl font-bold mb-4">Contact Us</h2>
          <p className="text-muted-foreground mb-4">Questions about these Terms? Contact us:</p>
          <div className="space-y-2 text-muted-foreground">
            <p><strong>Email:</strong> legal@spiritshield.com</p>
            <p><strong>Address:</strong> Windhoek, Namibia</p>
          </div>
        </Card>

        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            By using Spirit Shield Keeper, you acknowledge that you have read, understood, and 
            agree to be bound by these Terms of Service.
          </p>
          <p className="text-xs text-blue-800 dark:text-blue-200">
            Last updated: {new Date().toLocaleDateString('en-NA')}
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</div>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}
