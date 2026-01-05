import { Link } from "react-router-dom";
import { Home, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-6">
    <div className="text-center max-w-md">
      <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle className="w-10 h-10 text-destructive" /></div>
      <h1 className="text-6xl font-bold mb-2">404</h1>
      <p className="text-muted-foreground mb-8">Page not found</p>
      <Link to="/"><Button className="gap-2"><Home className="w-4 h-4" />Return Home</Button></Link>
    </div>
  </div>
);

export default NotFound;