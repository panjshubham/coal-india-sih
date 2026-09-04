CREATE OR REPLACE FUNCTION generate_critical_violation_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.severity IN ('critical', 'high') THEN
    INSERT INTO public.alerts (type, related_entity_id, message, severity)
    VALUES (
      'violation',
      NEW.id,
      'New ' || NEW.severity || ' violation logged. Action required immediately.',
      NEW.severity
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS critical_violation_trigger ON public.violations;
CREATE TRIGGER critical_violation_trigger
AFTER INSERT ON public.violations
FOR EACH ROW
EXECUTE FUNCTION generate_critical_violation_alert();
