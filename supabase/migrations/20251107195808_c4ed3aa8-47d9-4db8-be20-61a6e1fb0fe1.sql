-- Add foreign key constraints only if they don't exist
DO $$ 
BEGIN
  -- car_line_sessions foreign keys
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'car_line_sessions_school_id_fkey') THEN
    ALTER TABLE car_line_sessions ADD CONSTRAINT car_line_sessions_school_id_fkey 
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'car_line_sessions_dismissal_run_id_fkey') THEN
    ALTER TABLE car_line_sessions ADD CONSTRAINT car_line_sessions_dismissal_run_id_fkey 
      FOREIGN KEY (dismissal_run_id) REFERENCES dismissal_runs(id) ON DELETE CASCADE;
  END IF;

  -- car_line_pickups foreign keys
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'car_line_pickups_car_line_session_id_fkey') THEN
    ALTER TABLE car_line_pickups ADD CONSTRAINT car_line_pickups_car_line_session_id_fkey 
      FOREIGN KEY (car_line_session_id) REFERENCES car_line_sessions(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'car_line_pickups_student_id_fkey') THEN
    ALTER TABLE car_line_pickups ADD CONSTRAINT car_line_pickups_student_id_fkey 
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'car_line_pickups_managed_by_fkey') THEN
    ALTER TABLE car_line_pickups ADD CONSTRAINT car_line_pickups_managed_by_fkey 
      FOREIGN KEY (managed_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'car_line_pickups_lane_id_fkey') THEN
    ALTER TABLE car_line_pickups ADD CONSTRAINT car_line_pickups_lane_id_fkey 
      FOREIGN KEY (lane_id) REFERENCES car_line_lanes(id) ON DELETE SET NULL;
  END IF;

  -- walker_sessions foreign keys
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'walker_sessions_school_id_fkey') THEN
    ALTER TABLE walker_sessions ADD CONSTRAINT walker_sessions_school_id_fkey 
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'walker_sessions_dismissal_run_id_fkey') THEN
    ALTER TABLE walker_sessions ADD CONSTRAINT walker_sessions_dismissal_run_id_fkey 
      FOREIGN KEY (dismissal_run_id) REFERENCES dismissal_runs(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'walker_sessions_walker_location_id_fkey') THEN
    ALTER TABLE walker_sessions ADD CONSTRAINT walker_sessions_walker_location_id_fkey 
      FOREIGN KEY (walker_location_id) REFERENCES walker_locations(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'walker_sessions_managed_by_fkey') THEN
    ALTER TABLE walker_sessions ADD CONSTRAINT walker_sessions_managed_by_fkey 
      FOREIGN KEY (managed_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- walker_pickups foreign keys
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'walker_pickups_walker_session_id_fkey') THEN
    ALTER TABLE walker_pickups ADD CONSTRAINT walker_pickups_walker_session_id_fkey 
      FOREIGN KEY (walker_session_id) REFERENCES walker_sessions(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'walker_pickups_student_id_fkey') THEN
    ALTER TABLE walker_pickups ADD CONSTRAINT walker_pickups_student_id_fkey 
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'walker_pickups_managed_by_fkey') THEN
    ALTER TABLE walker_pickups ADD CONSTRAINT walker_pickups_managed_by_fkey 
      FOREIGN KEY (managed_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- bus_student_loading_events foreign keys
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bus_student_loading_events_bus_id_fkey') THEN
    ALTER TABLE bus_student_loading_events ADD CONSTRAINT bus_student_loading_events_bus_id_fkey 
      FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bus_student_loading_events_student_id_fkey') THEN
    ALTER TABLE bus_student_loading_events ADD CONSTRAINT bus_student_loading_events_student_id_fkey 
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bus_student_loading_events_dismissal_run_id_fkey') THEN
    ALTER TABLE bus_student_loading_events ADD CONSTRAINT bus_student_loading_events_dismissal_run_id_fkey 
      FOREIGN KEY (dismissal_run_id) REFERENCES dismissal_runs(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bus_student_loading_events_loaded_by_fkey') THEN
    ALTER TABLE bus_student_loading_events ADD CONSTRAINT bus_student_loading_events_loaded_by_fkey 
      FOREIGN KEY (loaded_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_car_line_sessions_dismissal_run_id ON car_line_sessions(dismissal_run_id);
CREATE INDEX IF NOT EXISTS idx_car_line_sessions_school_id ON car_line_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_car_line_pickups_car_line_session_id ON car_line_pickups(car_line_session_id);
CREATE INDEX IF NOT EXISTS idx_car_line_pickups_student_id ON car_line_pickups(student_id);
CREATE INDEX IF NOT EXISTS idx_walker_sessions_dismissal_run_id ON walker_sessions(dismissal_run_id);
CREATE INDEX IF NOT EXISTS idx_walker_sessions_school_id ON walker_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_walker_pickups_walker_session_id ON walker_pickups(walker_session_id);
CREATE INDEX IF NOT EXISTS idx_walker_pickups_student_id ON walker_pickups(student_id);
CREATE INDEX IF NOT EXISTS idx_bus_student_loading_events_dismissal_run_id ON bus_student_loading_events(dismissal_run_id);
CREATE INDEX IF NOT EXISTS idx_bus_student_loading_events_bus_id ON bus_student_loading_events(bus_id);
CREATE INDEX IF NOT EXISTS idx_bus_student_loading_events_student_id ON bus_student_loading_events(student_id);