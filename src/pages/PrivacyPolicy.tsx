import { Shield, Lock, Eye, Database, UserCheck, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
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
        <Section icon={<Database className="w-6 h-6" />} title="Information We Collect">
          <SubSection title="Personal Information">
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Name and email address (for account creation)</li>
              <li>Phone number (optional, for SMS alerts)</li>
              <li>Profile photo (optional)</li>
              <li>Username</li>
            </ul>
          </SubSection>

          <SubSection title="Location Data">
            <p className="text-muted-foreground">We collect precise location data when you:</p>
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
        <Section icon={<Eye className="w-6 h-6" />} title="How We Use Your Information">
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
        <Section icon={<UserCheck className="w-6 h-6" />} title="How We Share Your Information">
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
        <Section icon={<Lock className="w-6 h-6" />} title="Data Security">
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
        <Section icon={<UserCheck className="w-6 h-6" />} title="Your Rights">
          <p className="text-muted-foreground mb-4">You have the right to:</p>
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
        <Section icon={<Database className="w-6 h-6" />} title="Data Retention">
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Active incidents: Stored for 90 days after resolution</li>
            <li>User accounts: Until you request deletion</li>
            <li>Location data: Deleted after 30 days (except for reported incidents)</li>
            <li>Notifications: Deleted after 30 days if read</li>
          </ul>
        </Section>

        {/* Children's Privacy */}
        <Section icon={<UserCheck className="w-6 h-6" />} title="Children's Privacy">
          <p className="text-muted-foreground">
            Spirit Shield Keeper is not intended for children under 13 years of age. We do not 
            knowingly collect personal information from children under 13. If you believe we have 
            collected data from a child, please contact us immediately.
          </p>
        </Section>

        {/* Changes */}
        <Section icon={<Bell className="w-6 h-6" />} title="Changes to This Privacy Policy">
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

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
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
