import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RosterRow {
  studentId?: string;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  className: string;
  roomNumber?: string;
  teacherFirstName: string;
  teacherLastName: string;
  teacherEmail: string;
  parentGuardianName?: string;
  contactInfo?: string;
  specialNotes?: string;
  dismissalGroup?: string;
  transportation?: string;
  transportationMethod?: string;
  Transportation_Method?: string; // Handle CSV column name variation
}

// Define accepted column mappings
const COLUMN_MAPPINGS = {
  // Required fields
  'firstName': ['firstName', 'first_name', 'First_Name', 'FirstName'],
  'lastName': ['lastName', 'last_name', 'Last_Name', 'LastName'],
  'gradeLevel': ['gradeLevel', 'grade_level', 'Grade_Level', 'GradeLevel', 'grade'],
  'className': ['className', 'class_name', 'Class_Name', 'ClassName', 'class'],
  'teacherFirstName': ['teacherFirstName', 'teacher_first_name', 'Teacher_First_Name', 'TeacherFirstName'],
  'teacherLastName': ['teacherLastName', 'teacher_last_name', 'Teacher_Last_Name', 'TeacherLastName'],
  'teacherEmail': ['teacherEmail', 'teacher_email', 'Teacher_Email', 'TeacherEmail'],
  
  // Optional fields
  'studentId': ['studentId', 'student_id', 'Student_Id', 'StudentId', 'id'],
  'roomNumber': ['roomNumber', 'room_number', 'Room_Number', 'RoomNumber', 'room'],
  'parentGuardianName': ['parentGuardianName', 'parent_guardian_name', 'Parent_Guardian_Name', 'ParentGuardianName', 'parent', 'guardian'],
  'contactInfo': ['contactInfo', 'contact_info', 'Contact_Info', 'ContactInfo', 'contact', 'phone'],
  'specialNotes': ['specialNotes', 'special_notes', 'Special_Notes', 'SpecialNotes', 'notes'],
  'dismissalGroup': ['dismissalGroup', 'dismissal_group', 'Dismissal_Group', 'DismissalGroup', 'group'],
  'transportation': ['transportation', 'Transportation', 'transport_type', 'Transport_Type'],
  'transportationMethod': ['transportationMethod', 'transportation_method', 'Transportation_Method', 'TransportationMethod', 'transport_method', 'Transport_Method']
};

function validateAndMapColumns(sampleRow: any): { mappedColumns: string[], unmappedColumns: string[], requiredMissing: string[] } {
  const inputColumns = Object.keys(sampleRow);
  const mappedColumns: string[] = [];
  const unmappedColumns: string[] = [];
  const foundMappings: { [key: string]: string } = {};
  
  // Check each input column against our mappings
  for (const inputCol of inputColumns) {
    let mapped = false;
    for (const [targetField, variations] of Object.entries(COLUMN_MAPPINGS)) {
      if (variations.includes(inputCol)) {
        mappedColumns.push(`${inputCol} → ${targetField}`);
        foundMappings[targetField] = inputCol;
        mapped = true;
        break;
      }
    }
    if (!mapped) {
      unmappedColumns.push(inputCol);
    }
  }
  
  // Check for required fields
  const requiredFields = ['firstName', 'lastName', 'gradeLevel', 'className', 'teacherFirstName', 'teacherLastName', 'teacherEmail'];
  const requiredMissing = requiredFields.filter(field => !foundMappings[field]);
  
  return { mappedColumns, unmappedColumns, requiredMissing };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile and verify school_admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.school_id) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'school_admin')
      .single();

    if (roleError || !userRole) {
      return new Response(JSON.stringify({ error: 'Unauthorized: School admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const rosterData = JSON.parse(formData.get('rosterData') as string) as RosterRow[];
    const validateOnly = formData.get('validateOnly') === 'true';

    if (!file || !rosterData || !Array.isArray(rosterData)) {
      return new Response(JSON.stringify({ error: 'Invalid file or roster data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate column mappings using first row as sample
    if (rosterData.length > 0) {
      const validation = validateAndMapColumns(rosterData[0]);
      
      // If this is just a validation request, return validation results
      if (validateOnly) {
        return new Response(JSON.stringify({
          validation: true,
          mappedColumns: validation.mappedColumns,
          unmappedColumns: validation.unmappedColumns,
          requiredMissing: validation.requiredMissing,
          canProceed: validation.requiredMissing.length === 0,
          message: validation.requiredMissing.length > 0 
            ? `Missing required fields: ${validation.requiredMissing.join(', ')}`
            : validation.unmappedColumns.length > 0
              ? `${validation.unmappedColumns.length} unmapped columns will be ignored`
              : 'All columns mapped successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // If required fields are missing, reject the import
      if (validation.requiredMissing.length > 0) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields',
          details: `Required fields missing: ${validation.requiredMissing.join(', ')}`,
          validation: validation
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const results = {
      studentsCreated: 0,
      teachersCreated: 0,
      classesCreated: 0,
      studentsEnrolled: 0,
      teachersAssigned: 0,
      busesCreated: 0,
      carLinesCreated: 0,
      walkerLocationsCreated: 0,
      transportationAssignments: 0,
      errors: [] as string[],
    };

    console.log(`Processing ${rosterData.length} roster entries for school ${profile.school_id}`);

    // Set up PostgreSQL client for transactions
    const dbUrl = Deno.env.get('SUPABASE_DB_URL')!;
    const client = new Client(dbUrl);
    await client.connect();

    try {
      // Begin transaction
      await client.queryObject('BEGIN');
      console.log('Transaction started');

      // Track unique classes, teachers, and transportation items to avoid duplicates
      const processedClasses = new Map<string, string>(); // key -> classId
      const processedTeachers = new Map<string, string>(); // email -> userId
      const processedBuses = new Map<string, string>(); // busNumber -> busId
      const processedCarLines = new Map<string, string>(); // lineName -> carLineId
      const processedWalkerLocations = new Map<string, string>(); // locationName -> walkerLocationId

      for (let i = 0; i < rosterData.length; i++) {
      const row = rosterData[i];
      
      try {
        // 1. Create or get class
        const classKey = `${row.className}_${row.roomNumber || 'NO_ROOM'}`;
        let classId = processedClasses.get(classKey);
        
        if (!classId) {
          const existingClassResult = await client.queryObject(
            `SELECT id FROM classes WHERE class_name = $1 AND room_number = $2 AND school_id = $3`,
            [row.className, row.roomNumber || null, profile.school_id]
          );

          if (existingClassResult.rows.length > 0) {
            classId = (existingClassResult.rows[0] as any).id as string;
          } else {
            const newClassResult = await client.queryObject(
              `INSERT INTO classes (class_name, room_number, school_id, grade_level) 
               VALUES ($1, $2, $3, $4) RETURNING id`,
              [row.className, row.roomNumber || null, profile.school_id, row.gradeLevel]
            );

            if (newClassResult.rows.length === 0) {
              throw new Error(`Failed to create class ${row.className}`);
            }
            classId = (newClassResult.rows[0] as any).id as string;
            results.classesCreated++;
          }
          processedClasses.set(classKey, classId);
        }

        // 2. Process teacher
        let teacherId = processedTeachers.get(row.teacherEmail);
        
        if (!teacherId) {
          // Check if teacher exists in teachers table
          const existingTeacherResult = await client.queryObject(
            `SELECT id FROM teachers WHERE email = $1 AND school_id = $2`,
            [row.teacherEmail, profile.school_id]
          );

          if (existingTeacherResult.rows.length > 0) {
            teacherId = (existingTeacherResult.rows[0] as any).id as string;
          } else {
            // Create teacher record
            const newTeacherResult = await client.queryObject(
              `INSERT INTO teachers (first_name, last_name, email, school_id) 
               VALUES ($1, $2, $3, $4) RETURNING id`,
              [row.teacherFirstName, row.teacherLastName, row.teacherEmail, profile.school_id]
            );

            if (newTeacherResult.rows.length === 0) {
              throw new Error(`Failed to create teacher ${row.teacherFirstName} ${row.teacherLastName}`);
            }
            teacherId = (newTeacherResult.rows[0] as any).id as string;
            results.teachersCreated++;
          }
          processedTeachers.set(row.teacherEmail, teacherId);
        }

        // Assign teacher to class
        await client.queryObject(
          `INSERT INTO class_teachers (teacher_id, class_id) VALUES ($1, $2) 
           ON CONFLICT (teacher_id, class_id) DO NOTHING`,
          [teacherId, classId]
        );
        results.teachersAssigned++;

        // 3. Create student
        let studentId: string;
        let existingStudentResult;
        
        // Only check for existing student if student_id is provided
        if (row.studentId) {
          existingStudentResult = await client.queryObject(
            `SELECT id FROM students WHERE student_id = $1 AND school_id = $2`,
            [row.studentId, profile.school_id]
          );
        }
        
        if (existingStudentResult?.rows && existingStudentResult.rows.length > 0) {
          studentId = (existingStudentResult.rows[0] as any).id as string;
        } else {
          const newStudentResult = await client.queryObject(
            `INSERT INTO students (student_id, first_name, last_name, grade_level, school_id, 
                                 parent_guardian_name, contact_info, special_notes, dismissal_group) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [
              row.studentId || null,
              row.firstName,
              row.lastName,
              row.gradeLevel,
              profile.school_id,
              row.parentGuardianName || null,
              row.contactInfo || null,
              row.specialNotes || null,
              row.dismissalGroup || null
            ]
          );

          if (newStudentResult.rows.length === 0) {
            throw new Error(`Failed to create student ${row.firstName} ${row.lastName}`);
          }
          studentId = (newStudentResult.rows[0] as any).id as string;
          results.studentsCreated++;
        }

        // 4. Enroll student in class
        await client.queryObject(
          `INSERT INTO class_rosters (student_id, class_id) VALUES ($1, $2) 
           ON CONFLICT (student_id, class_id) DO NOTHING`,
          [studentId, classId]
        );
        results.studentsEnrolled++;

        // 5. Handle transportation assignments
        const transportationMethod = row.transportationMethod || row.Transportation_Method;
        if (row.transportation && transportationMethod) {
          let transportationType = row.transportation.toLowerCase().trim();
          const transportationMethodValue = transportationMethod.trim();

          // Normalize transportation types
          if (transportationType === 'car rider' || transportationType === 'car_rider' || transportationType === 'car line' || transportationType === 'carline') {
            transportationType = 'car';
          }

          try {
            if (transportationType === 'bus') {
               // Handle bus assignment
               let busId = processedBuses.get(transportationMethodValue);
               
               if (!busId) {
                 // Check if bus exists
                 const existingBusResult = await client.queryObject(
                   `SELECT id FROM buses WHERE bus_number = $1 AND school_id = $2`,
                   [transportationMethodValue, profile.school_id]
                 );

                  if (existingBusResult.rows.length > 0) {
                    busId = (existingBusResult.rows[0] as any).id as string;
                 } else {
                   // Create new bus
                   const newBusResult = await client.queryObject(
                     `INSERT INTO buses (bus_number, school_id, driver_first_name, driver_last_name) 
                      VALUES ($1, $2, $3, $4) RETURNING id`,
                     [transportationMethodValue, profile.school_id, 'TBD', 'TBD']
                   );

                   if (newBusResult.rows.length === 0) {
                     throw new Error(`Failed to create bus ${transportationMethodValue}`);
                   }
                   busId = (newBusResult.rows[0] as any).id as string;
                   results.busesCreated++;
                 }
                 processedBuses.set(transportationMethodValue, busId);
               }

        if (transportationMethod && transportationMethod.trim()) {
          // Assign student to bus
          await client.queryObject(
            `INSERT INTO student_bus_assignments (student_id, bus_id) VALUES ($1, $2) 
             ON CONFLICT (student_id, bus_id) DO NOTHING`,
            [studentId, busId]
          );
          results.transportationAssignments++;
        }
        
        // Send teacher invitation email if needed
        const shouldSendInvitation = !processedTeachers.has(row.teacherEmail + '_invited');
        if (shouldSendInvitation) {
          try {
            const invitationResponse = await supabase.functions.invoke('invite-teacher-unified', {
              body: {
                email: row.teacherEmail,
                firstName: row.teacherFirstName,
                lastName: row.teacherLastName,
                schoolId: profile.school_id
              }
            });
            
            if (invitationResponse.error) {
              console.error('Failed to send teacher invitation:', invitationResponse.error);
              results.errors.push(`Failed to send invitation to ${row.teacherEmail}: ${invitationResponse.error.message}`);
            } else {
              console.log(`Teacher invitation sent to ${row.teacherEmail}`);
            }
            
            processedTeachers.set(row.teacherEmail + '_invited', 'sent');
          } catch (inviteError) {
            console.error('Error sending teacher invitation:', inviteError);
            results.errors.push(`Failed to send invitation to ${row.teacherEmail}: ${inviteError instanceof Error ? inviteError.message : 'Unknown error'}`);
          }
        }

            } else if (transportationType === 'car') {
               // Handle car line assignment
               let carLineId = processedCarLines.get(transportationMethodValue);
               
               if (!carLineId) {
                 // Check if car line exists
                 const existingCarLineResult = await client.queryObject(
                   `SELECT id FROM car_lines WHERE line_name = $1 AND school_id = $2`,
                   [transportationMethodValue, profile.school_id]
                 );

                  if (existingCarLineResult.rows.length > 0) {
                    carLineId = (existingCarLineResult.rows[0] as any).id as string;
                 } else {
                   // Create new car line
                   const newCarLineResult = await client.queryObject(
                     `INSERT INTO car_lines (line_name, school_id, color, pickup_location) 
                      VALUES ($1, $2, $3, $4) RETURNING id`,
                     [transportationMethodValue, profile.school_id, '#3B82F6', transportationMethodValue]
                   );

                   if (newCarLineResult.rows.length === 0) {
                     throw new Error(`Failed to create car line ${transportationMethodValue}`);
                   }
                   carLineId = (newCarLineResult.rows[0] as any).id as string;
                   results.carLinesCreated++;
                 }
                 processedCarLines.set(transportationMethodValue, carLineId);
               }

              // Assign student to car line
              await client.queryObject(
                `INSERT INTO student_car_assignments (student_id, car_line_id) VALUES ($1, $2) 
                 ON CONFLICT (student_id, car_line_id) DO NOTHING`,
                [studentId, carLineId]
              );
              results.transportationAssignments++;

            } else if (transportationType === 'walker') {
               // Handle walker location assignment
               let walkerLocationId = processedWalkerLocations.get(transportationMethodValue);
               
               if (!walkerLocationId) {
                 // Check if walker location exists
                 const existingWalkerLocationResult = await client.queryObject(
                   `SELECT id FROM walker_locations WHERE location_name = $1 AND school_id = $2`,
                   [transportationMethodValue, profile.school_id]
                 );

                  if (existingWalkerLocationResult.rows.length > 0) {
                    walkerLocationId = (existingWalkerLocationResult.rows[0] as any).id as string;
                 } else {
                   // Create new walker location
                   const newWalkerLocationResult = await client.queryObject(
                     `INSERT INTO walker_locations (location_name, school_id) 
                      VALUES ($1, $2) RETURNING id`,
                     [transportationMethodValue, profile.school_id]
                   );

                   if (newWalkerLocationResult.rows.length === 0) {
                     throw new Error(`Failed to create walker location ${transportationMethodValue}`);
                   }
                   walkerLocationId = (newWalkerLocationResult.rows[0] as any).id as string;
                   results.walkerLocationsCreated++;
                 }
                 processedWalkerLocations.set(transportationMethodValue, walkerLocationId);
               }

              // Assign student to walker location
              await client.queryObject(
                `INSERT INTO student_walker_assignments (student_id, walker_location_id) VALUES ($1, $2) 
                 ON CONFLICT (student_id, walker_location_id) DO NOTHING`,
                [studentId, walkerLocationId]
              );
              results.transportationAssignments++;

            } else {
              // This is a warning, not an error - don't throw
              console.log(`Row ${i + 1}: Unrecognized transportation type: ${transportationType} (original: ${row.transportation})`);
            }
          } catch (transportError) {
            console.log(`Row ${i + 1}: Transportation processing error - ${transportError instanceof Error ? transportError.message : 'Unknown error'}`);
          }
        }

      } catch (error) {
        console.error(`Critical error processing row ${i + 1}:`, error);
        throw new Error(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Commit transaction if everything succeeded
    await client.queryObject('COMMIT');
    console.log('Transaction committed successfully');

    console.log('Import completed:', results);

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      message: `Successfully processed ${rosterData.length} rows. Created ${results.studentsCreated} students, ${results.teachersCreated} teachers, ${results.classesCreated} classes, ${results.busesCreated} buses, ${results.carLinesCreated} car lines, ${results.walkerLocationsCreated} walker locations with ${results.transportationAssignments} transportation assignments.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (transactionError) {
    // Rollback transaction on any error
    try {
      await client.queryObject('ROLLBACK');
      console.log('Transaction rolled back due to error');
    } catch (rollbackError) {
      console.error('Error during rollback:', rollbackError);
    }
    
    console.error('Import failed, transaction rolled back:', transactionError);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Import failed and was rolled back',
      details: transactionError instanceof Error ? transactionError.message : 'Unknown error',
      message: 'The import failed and no changes were made to the database. Please fix the errors and try again.'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } finally {
    // Always close the database connection
    await client.end();
  }

  } catch (error) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});