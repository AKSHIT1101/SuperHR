import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiPost } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function InviteDecision() {
  const { toast } = useToast();
  const { refreshFromToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const decisionToken = useMemo(() => new URLSearchParams(location.search).get('decision_token') || '', [location.search]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!decisionToken) {
      toast({ title: 'Missing invite token', variant: 'destructive' });
      navigate('/auth', { replace: true });
    }
  }, [decisionToken, navigate, toast]);

  const handle = async (action: 'accept' | 'decline') => {
    if (!decisionToken) return;
    setLoading(true);
    try {
      const resp = await apiPost<any>(`/auth/invite/${action}`, { decision_token: decisionToken });
      if (resp?.access_token) {
        localStorage.setItem('crm_token', resp.access_token);
        await refreshFromToken(resp.access_token);
        // New org likely needs schema setup.
        navigate('/schema-setup', { replace: true });
      } else {
        toast({ title: 'Unexpected response', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Organization Invitation</CardTitle>
          <CardDescription>
            You’ve been invited to join an organization. You can accept to join, or decline to create your own organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => handle('decline')} disabled={loading}>Decline</Button>
          <Button onClick={() => handle('accept')} disabled={loading}>Accept</Button>
        </CardContent>
      </Card>
    </div>
  );
}

