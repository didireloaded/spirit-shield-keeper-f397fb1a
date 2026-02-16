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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col" onPointerDownOutside={(e) => e.preventDefault()}>
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
                <label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                  I have read and agree to the{' '}
                  <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
                </label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="privacy"
                  checked={agreedToPrivacy}
                  onCheckedChange={(checked) => setAgreedToPrivacy(checked as boolean)}
                />
                <label htmlFor="privacy" className="text-sm leading-relaxed cursor-pointer">
                  I have read and agree to the{' '}
                  <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                </label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="age"
                  checked={ageConfirmed}
                  onCheckedChange={(checked) => setAgeConfirmed(checked as boolean)}
                />
                <label htmlFor="age" className="text-sm leading-relaxed cursor-pointer">
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
