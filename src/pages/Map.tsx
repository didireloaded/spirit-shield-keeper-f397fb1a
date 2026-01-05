import { useEffect, useState, useRef } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const INCIDENT_TYPES = [
  { value: 'robbery', label: 'Robbery', color: '#F97316' },
  { value: 'assault', label: 'Assault', color: '#EF4444' },
  { value: 'accident', label: 'Accident', color: '#EAB308' },
  { value: 'suspicious', label: 'Suspicious', color: '#A855F7' },
  { value: 'other', label: 'Other', color: '#6B7280' },
];

const Map = () => {
  const [tokenMissing, setTokenMissing] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportLocation, setReportLocation] = useState<[number, number] | null>(null);
  const [incidentType, setIncidentType] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initMap = async () => {
      try {
        const { data } = await supabase.functions.invoke('get-mapbox-token');
        if (!data?.token) { setTokenMissing(true); return; }
        mapboxgl.accessToken = data.token;
        if (!mapContainerRef.current || mapRef.current) return;
        mapRef.current = new mapboxgl.Map({ container: mapContainerRef.current, style: 'mapbox://styles/mapbox/streets-v12', center: [17.083, -22.56], zoom: 12 });
        mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        mapRef.current.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'top-right');
      } catch { setTokenMissing(true); }
    };
    initMap();
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  const handleReport = async () => {
    if (!reportLocation || !incidentType) { toast({ title: 'Select incident type', variant: 'destructive' }); return; }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      await supabase.from('alerts').insert({ user_id: user.id, type: incidentType as any, latitude: reportLocation[1], longitude: reportLocation[0], description: incidentDescription });
      toast({ title: 'Incident reported' });
      setShowReportDialog(false); setIncidentType(''); setIncidentDescription('');
    } catch { toast({ title: 'Failed to report', variant: 'destructive' }); }
    setSubmitting(false);
  };

  return (
    <div className="relative h-screen w-full">
      <div ref={mapContainerRef} className="absolute inset-0" />
      {tokenMissing && <div className="absolute inset-0 flex items-center justify-center bg-muted/90 z-10"><div className="text-center p-6 bg-card rounded-lg"><MapPin className="h-12 w-12 mx-auto mb-2 text-muted-foreground" /><p className="text-sm text-muted-foreground">Mapbox token not configured</p></div></div>}
      <Button onClick={() => { navigator.geolocation.getCurrentPosition((pos) => { setReportLocation([pos.coords.longitude, pos.coords.latitude]); setShowReportDialog(true); }); }} className="absolute bottom-24 right-4 h-14 w-14 rounded-full shadow-lg z-20" size="icon"><Plus className="h-6 w-6" /></Button>
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent><DialogHeader><DialogTitle>Report Incident</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Type</Label><Select value={incidentType} onValueChange={setIncidentType}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{INCIDENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Description</Label><Textarea value={incidentDescription} onChange={(e) => setIncidentDescription(e.target.value)} rows={3} /></div>
            <div className="flex gap-2"><Button variant="outline" onClick={() => setShowReportDialog(false)} className="flex-1">Cancel</Button><Button onClick={handleReport} disabled={submitting} className="flex-1">{submitting ? 'Reporting...' : 'Report'}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="absolute bottom-0 left-0 right-0 z-30"><Navigation /></div>
    </div>
  );
};

export default Map;