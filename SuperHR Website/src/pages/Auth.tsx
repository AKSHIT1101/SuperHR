import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const navigate = useNavigate();
  const { loginWithGoogle, loginWithMicrosoft, loading } = useAuth();
  const { toast } = useToast();

  const handleGoogleLogin = async () => {
    const success = await loginWithGoogle();
    if (success) {
      toast({ title: 'Welcome!' });
      navigate('/');
    }
  };

  const handleMicrosoftLogin = async () => {
    const success = await loginWithMicrosoft();
    if (success) {
      toast({ title: 'Welcome!' });
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-xl mb-4">PC</div>
          <h1 className="text-2xl font-bold">Prompt CRM</h1>
          <p className="text-muted-foreground mt-1">Sign in with your organization account</p>
        </div>
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle>Single Sign-On</CardTitle>
            <CardDescription>Continue with Google or Microsoft</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" onClick={handleGoogleLogin} disabled={loading} className="w-full">{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Google SSO</Button>
            <Button variant="outline" onClick={handleMicrosoftLogin} disabled={loading} className="w-full">{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Microsoft SSO</Button>
            <p className="text-center text-xs text-muted-foreground pt-1">Roles are assigned by admin after sign-in.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
