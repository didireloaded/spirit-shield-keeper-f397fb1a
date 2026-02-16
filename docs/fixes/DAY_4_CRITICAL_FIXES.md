# DAY 4 CRITICAL FIXES - Legal Compliance
## ⏱️ Time Required: 2-3 hours
## 🎯 Priority: CRITICAL - Legal Protection

---

## Part 1: Privacy Policy Page (45 minutes)

### File: `src/pages/PrivacyPolicy.tsx`

```typescript
import { Shield, Lock, Eye, Database, UserCheck, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 to-transparent px-4 pt-8 pb-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
          </div>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-NA')}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Introduction */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Introduction</h2>
          <p className="text-muted-foreground">
            Spirit Shield Keeper ("we", "our", or "us") is committed to protecting your privacy. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
            when you use our community safety application.
          </p>
        </Card>

        {/* Information We Collect */}
        <Section
          icon={<Database className="w-6 h-6" />}
          title="Information We Collect"
        >
          <SubSection title="Personal Information">
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Name and email address (for account creation)</li>
              <li>Phone number (optional, for SMS alerts)</li>
              <li>Profile photo (optional)</li>
              <li>Username</li>
            </ul>
          </SubSection>

          <SubSection title="Location Data">
            <p className="text-muted-foreground">
              We collect precise location data when you:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Report an incident</li>
              <li>Activate panic button</li>
              <li>Use "Look After Me" trip monitoring</li>
              <li>Share your location with watchers</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              You can control location sharing in your device settings. Location data is only 
              collected when you actively use these features.
            </p>
          </SubSection>

          <SubSection title="Usage Data">
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Device information (type, operating system)</li>
              <li>IP address</li>
              <li>App usage patterns</li>
              <li>Incident reports and community posts you create</li>
              <li>Interactions with other users' content</li>
            </ul>
          </SubSection>
        </Section>

        {/* How We Use Your Information */}
        <Section
          icon={<Eye className="w-6 h-6" />}
          title="How We Use Your Information"
        >
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Provide emergency assistance and safety alerts</li>
            <li>Share incident reports with nearby community members</li>
            <li>Enable trip monitoring and watcher functionality</li>
            <li>Prevent fraud, spam, and abuse</li>
            <li>Improve app functionality and user experience</li>
            <li>Send important notifications about safety incidents</li>
            <li>Comply with legal obligations</li>
          </ul>
        </Section>

        {/* Information Sharing */}
        <Section
          icon={<UserCheck className="w-6 h-6" />}
          title="How We Share Your Information"
        >
          <SubSection title="With Other Users">
            <p className="text-muted-foreground">
              When you create public content (incidents, community posts), this information is 
              visible to other users in your area. Your username, credibility score, and content 
              will be public.
            </p>
          </SubSection>

          <SubSection title="With Your Watchers">
            <p className="text-muted-foreground">
              If you use "Look After Me" or add watchers, your real-time location and safety 
              status will be shared with those specific users.
            </p>
          </SubSection>

          <SubSection title="With Emergency Services">
            <p className="text-muted-foreground">
              When you activate the panic button or create an Amber alert, we may share your 
              location and relevant information with emergency services to assist you.
            </p>
          </SubSection>

          <SubSection title="Legal Requirements">
            <p className="text-muted-foreground">
              We may disclose information if required by law, court order, or government request, 
              or to protect the rights, property, or safety of Spirit Shield Keeper, our users, 
              or others.
            </p>
          </SubSection>

          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              We DO NOT sell your personal information to third parties.
            </p>
          </div>
        </Section>

        {/* Data Security */}
        <Section
          icon={<Lock className="w-6 h-6" />}
          title="Data Security"
        >
          <p className="text-muted-foreground mb-4">
            We implement appropriate technical and organizational measures to protect your data:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Encrypted data transmission (SSL/TLS)</li>
            <li>Secure database storage</li>
            <li>Access controls and authentication</li>
            <li>Regular security audits</li>
            <li>Password hashing</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            However, no method of transmission over the Internet is 100% secure. We cannot 
            guarantee absolute security.
          </p>
        </Section>

        {/* Your Rights */}
        <Section
          icon={<UserCheck className="w-6 h-6" />}
          title="Your Rights"
        >
          <p className="text-muted-foreground mb-4">
            You have the right to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and data</li>
            <li><strong>Opt-out:</strong> Disable location tracking or notifications</li>
            <li><strong>Data Portability:</strong> Receive your data in a structured format</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            To exercise these rights, contact us at{' '}
            <a href="mailto:privacy@spiritshield.com" className="text-primary hover:underline">
              privacy@spiritshield.com
            </a>
          </p>
        </Section>

        {/* Data Retention */}
        <Section
          icon={<Database className="w-6 h-6" />}
          title="Data Retention"
        >
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Active incidents: Stored for 90 days after resolution</li>
            <li>User accounts: Until you request deletion</li>
            <li>Location data: Deleted after 30 days (except for reported incidents)</li>
            <li>Notifications: Deleted after 30 days if read</li>
          </ul>
        </Section>

        {/* Children's Privacy */}
        <Section
          icon={<UserCheck className="w-6 h-6" />}
          title="Children's Privacy"
        >
          <p className="text-muted-foreground">
            Spirit Shield Keeper is not intended for children under 13 years of age. We do not 
            knowingly collect personal information from children under 13. If you believe we have 
            collected data from a child, please contact us immediately.
          </p>
        </Section>

        {/* Changes to Privacy Policy */}
        <Section
          icon={<Bell className="w-6 h-6" />}
          title="Changes to This Privacy Policy"
        >
          <p className="text-muted-foreground">
            We may update this Privacy Policy from time to time. We will notify you of any changes 
            by posting the new Privacy Policy on this page and updating the "Last updated" date. 
            Significant changes will be communicated via email or app notification.
          </p>
        </Section>

        {/* Contact */}
        <Card className="p-6 bg-primary/5">
          <h2 className="text-xl font-bold mb-4">Contact Us</h2>
          <p className="text-muted-foreground mb-4">
            If you have questions about this Privacy Policy, please contact us:
          </p>
          <div className="space-y-2 text-muted-foreground">
            <p><strong>Email:</strong> privacy@spiritshield.com</p>
            <p><strong>Address:</strong> Windhoek, Namibia</p>
          </div>
        </Card>

        {/* Governing Law */}
        <div className="text-sm text-muted-foreground">
          <p>
            This Privacy Policy is governed by the laws of the Republic of Namibia. 
            Any disputes will be resolved in the courts of Namibia.
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function Section({ icon, title, children }: any) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          {icon}
        </div>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </Card>
  );
}

function SubSection({ title, children }: any) {
  return (
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}
```

---

## Part 2: Terms of Service Page (45 minutes)

### File: `src/pages/TermsOfService.tsx`

```typescript
import { FileText, AlertTriangle, Shield, Users, Scale } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 to-transparent px-4 pt-8 pb-6">
        <div className="max-w-3xl mx-auto">
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
        {/* Important Notice */}
        <Alert>
          <AlertTriangle className="w-5 h-5" />
          <AlertDescription>
            <strong>Important:</strong> By using Spirit Shield Keeper, you agree to these Terms of Service. 
            Please read them carefully. If you do not agree, do not use the app.
          </AlertDescription>
        </Alert>

        {/* Acceptance */}
        <Section
          icon={<FileText className="w-6 h-6" />}
          title="1. Acceptance of Terms"
        >
          <p className="text-muted-foreground">
            These Terms of Service ("Terms") govern your access to and use of Spirit Shield Keeper 
            ("the App"). By creating an account or using the App, you agree to be bound by these Terms 
            and our Privacy Policy.
          </p>
        </Section>

        {/* Emergency Disclaimer */}
        <Section
          icon={<AlertTriangle className="w-6 h-6" />}
          title="2. Emergency Services Disclaimer"
        >
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

        {/* User Accounts */}
        <Section
          icon={<Users className="w-6 h-6" />}
          title="3. User Accounts and Eligibility"
        >
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

        {/* Acceptable Use */}
        <Section
          icon={<Shield className="w-6 h-6" />}
          title="4. Acceptable Use Policy"
        >
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

        {/* Credibility System */}
        <Section
          icon={<Shield className="w-6 h-6" />}
          title="5. Credibility System"
        >
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

        {/* Content */}
        <Section
          icon={<FileText className="w-6 h-6" />}
          title="6. Content and Intellectual Property"
        >
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

        {/* Liability Limitation */}
        <Section
          icon={<Scale className="w-6 h-6" />}
          title="7. Limitation of Liability"
        >
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              <strong>IMPORTANT LEGAL NOTICE:</strong> Please read this section carefully.
            </AlertDescription>
          </Alert>

          <p className="text-muted-foreground mb-4">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW:
          </p>
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

        {/* Indemnification */}
        <Section
          icon={<Shield className="w-6 h-6" />}
          title="8. Indemnification"
        >
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

        {/* Termination */}
        <Section
          icon={<AlertTriangle className="w-6 h-6" />}
          title="9. Termination"
        >
          <p className="text-muted-foreground mb-4">
            We may suspend or terminate your account if:
          </p>
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

        {/* Changes to Terms */}
        <Section
          icon={<FileText className="w-6 h-6" />}
          title="10. Changes to Terms"
        >
          <p className="text-muted-foreground">
            We may modify these Terms at any time. We will notify you of significant changes via 
            email or app notification. Continued use after changes constitutes acceptance.
          </p>
        </Section>

        {/* Governing Law */}
        <Section
          icon={<Scale className="w-6 h-6" />}
          title="11. Governing Law and Disputes"
        >
          <p className="text-muted-foreground">
            These Terms are governed by the laws of the Republic of Namibia. Any disputes will be 
            resolved in the courts of Windhoek, Namibia.
          </p>
        </Section>

        {/* Contact */}
        <Card className="p-6 bg-primary/5">
          <h2 className="text-xl font-bold mb-4">Contact Us</h2>
          <p className="text-muted-foreground mb-4">
            Questions about these Terms? Contact us:
          </p>
          <div className="space-y-2 text-muted-foreground">
            <p><strong>Email:</strong> legal@spiritshield.com</p>
            <p><strong>Address:</strong> Windhoek, Namibia</p>
          </div>
        </Card>

        {/* Acknowledgment */}
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

// Helper Components
function Section({ icon, title, children }: any) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          {icon}
        </div>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </Card>
  );
}

function SubSection({ title, children }: any) {
  return (
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}
```

---

## Part 3: Consent Dialog (30 minutes)

### File: `src/components/legal/ConsentDialog.tsx`

```typescript
import { useState } from "react";
import { Shield, FileText, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";

interface ConsentDialogProps {
  open: boolean;
  onAccept: () => void;
}

export function ConsentDialog({ open, onAccept }: ConsentDialogProps) {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const canProceed = agreedToTerms && agreedToPrivacy && ageConfirmed;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary" />
            <DialogTitle className="text-2xl">Welcome to Spirit Shield</DialogTitle>
          </div>
          <DialogDescription>
            Before you start, please review and accept our terms
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Key Points */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                Key Points to Know:
              </h3>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Spirit Shield is NOT a replacement for emergency services (10111)</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>We collect location data to provide safety features</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Public reports are visible to nearby users</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>False reports will affect your credibility score</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>We use community moderation to keep content safe</span>
                </li>
              </ul>
            </div>

            {/* Privacy Summary */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Privacy & Data</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                We collect and use your information to provide safety features. Your location is 
                shared with nearby users when you report incidents. We do not sell your data to 
                third parties.
              </p>
              <Link to="/privacy" className="text-sm text-primary hover:underline">
                Read full Privacy Policy →
              </Link>
            </div>

            {/* Terms Summary */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Terms of Use</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                By using Spirit Shield, you agree not to submit false reports, harass others, or 
                misuse the platform. Violations may result in account suspension.
              </p>
              <Link to="/terms" className="text-sm text-primary hover:underline">
                Read full Terms of Service →
              </Link>
            </div>

            {/* Checkboxes */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                />
                <label
                  htmlFor="terms"
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  I have read and agree to the{' '}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>
                </label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="privacy"
                  checked={agreedToPrivacy}
                  onCheckedChange={(checked) => setAgreedToPrivacy(checked as boolean)}
                />
                <label
                  htmlFor="privacy"
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  I have read and agree to the{' '}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="age"
                  checked={ageConfirmed}
                  onCheckedChange={(checked) => setAgeConfirmed(checked as boolean)}
                />
                <label
                  htmlFor="age"
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  I confirm that I am at least 13 years old
                </label>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button
            onClick={onAccept}
            disabled={!canProceed}
            className="w-full sm:w-auto"
            size="lg"
          >
            Accept and Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Part 4: Integration (30 minutes)

### Update App.tsx

```typescript
// Add routes for legal pages
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";

// In your routes:
<Route path="/privacy" element={<PrivacyPolicy />} />
<Route path="/terms" element={<TermsOfService />} />
```

### Update Auth Flow

```typescript
// In Auth.tsx or similar
import { ConsentDialog } from "@/components/legal/ConsentDialog";

const [showConsent, setShowConsent] = useState(false);
const [hasAcceptedTerms, setHasAcceptedTerms] = useState(
  localStorage.getItem('termsAccepted') === 'true'
);

// After successful signup:
const handleSignup = async () => {
  // ... existing signup logic
  
  if (success) {
    setShowConsent(true);
  }
};

const handleAcceptTerms = () => {
  localStorage.setItem('termsAccepted', 'true');
  localStorage.setItem('termsAcceptedDate', new Date().toISOString());
  setHasAcceptedTerms(true);
  setShowConsent(false);
  // Redirect to main app
};

// Render consent dialog
{showConsent && (
  <ConsentDialog
    open={showConsent}
    onAccept={handleAcceptTerms}
  />
)}
```

---

## ✅ Verification Checklist

- [ ] Privacy Policy page created
- [ ] Terms of Service page created
- [ ] Consent dialog component created
- [ ] Routes added for /privacy and /terms
- [ ] Consent dialog integrated into auth flow
- [ ] Terms acceptance tracked in localStorage
- [ ] Age verification included
- [ ] All links working

---

## 🧪 Testing

1. Create new account - should show consent dialog
2. Verify all checkboxes required
3. Test Privacy Policy link opens correctly
4. Test Terms of Service link opens correctly
5. Verify terms acceptance is stored
6. Test that returning users don't see consent again

---

## 📊 Expected Results

**Before:**
- No legal protection ❌
- No user consent ❌
- GDPR/data protection issues ❌

**After:**
- Clear Privacy Policy ✅
- Comprehensive Terms of Service ✅
- User consent flow ✅
- Age verification ✅
- Legal protection ✅

---

## ⏭️ Next Steps

Move to **DAY_5_FINAL_POLISH.md** - Performance, Monitoring, Final touches

**Estimated time: 2-3 hours**  
**Impact: Legal compliance achieved**  
**Status after completion: Legally ready to launch ✅**
