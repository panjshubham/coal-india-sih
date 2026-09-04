INSERT INTO public.violations (mine_id, category, severity, description, status) VALUES (1, 'safety', 'critical', 'Test critical violation from system', 'open') RETURNING id;
