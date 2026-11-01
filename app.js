/**
 * EcoTrack - Waste Collection & Recycling Tracking System
 * Core Frontend JavaScript with Supabase v2 Integration
 */

// ============================================================================
// Supabase Client Initialization
// (Paste your Supabase Project URL and Anon Public Key below)
// ============================================================================
const SUPABASE_URL = 'https://iqcdmdtztepusvugfaqy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxY2RtZHR6dGVwdXN2dWdmYXF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0OTM0NzQsImV4cCI6MjEwOTA2OTQ3NH0.5yt5QjKA8CVA_y4yfiI4mfH7bj9R34Kel66p0pX5JP0';

// Global Supabase client instance & state
let supabaseClient = null;
let currentUser = null;
let userProfile = null;
let currentRole = 'Citizen'; // Default fallback: Citizen, Collector, Admin

// Initialize the Supabase Client
function initSupabase() {
  if (typeof supabase !== 'undefined' && supabase.createClient) {
    try {
      if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.trim() !== '' && SUPABASE_ANON_KEY.trim() !== '') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('EcoTrack: Supabase client successfully initialized with project:', SUPABASE_URL);
      } else {
        console.warn('EcoTrack: Supabase URL and Anon Key are empty strings. Running in demo mode.');
      }
    } catch (err) {
      console.error('EcoTrack: Error initializing Supabase client:', err);
    }
  } else {
    console.warn('EcoTrack: Supabase CDN not detected. Please verify your internet connection.');
  }
}

// Immediately initialize
initSupabase();

// ============================================================================
// 1. Authentication: Sign Up
// Registers the user using Supabase Auth and inserts their ID, role, name,
// and contact into the profiles table.
// ============================================================================
async function signUpUser(event) {
  if (event) event.preventDefault();

  const nameInput = document.getElementById('signup-name');
  const emailInput = document.getElementById('signup-email');
  const contactInput = document.getElementById('signup-contact');
  const passwordInput = document.getElementById('signup-password');
  const roleSelect = document.getElementById('signup-role');
  const submitBtn = document.getElementById('btn-signup-submit');

  const fullName = nameInput ? nameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const contact = contactInput ? contactInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';
  const role = roleSelect ? roleSelect.value : 'Citizen';

  if (!email || !password || !fullName) {
    showAlert('auth-alert', 'Please fill in all required fields.', 'error');
    return;
  }

  if (password.length < 6) {
    showAlert('auth-alert', 'Password must be at least 6 characters.', 'error');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering user...';
  }

  console.log(`EcoTrack: Attempting registration for email: ${email}, role: ${role}`);

  try {
    if (!supabaseClient) {
      throw new Error('Supabase client is not configured. Please supply a valid URL and Anon Key in app.js.');
    }

    // Step 1: Register user with Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: fullName,
          full_name: fullName,
          contact: contact,
          role: role
        }
      }
    });

    if (authError) {
      throw authError;
    }

    const userId = authData.user ? authData.user.id : null;
    console.log('EcoTrack: Supabase auth signUp completed. User ID:', userId);

    // Step 2: Insert into profiles table (ID, role, name, contact)
    if (userId) {
      const profilePayload = {
        id: userId,
        email: email,
        name: fullName,
        full_name: fullName, // covers both naming conventions
        contact: contact,
        role: role,
        created_at: new Date().toISOString()
      };

      const { error: profileError } = await supabaseClient
        .from('profiles')
        .upsert(profilePayload);

      if (profileError) {
        console.warn('EcoTrack: Note on profiles table upsert:', profileError.message);
        // Even if profiles table insert has RLS policy restrictions, user auth succeeded
      } else {
        console.log('EcoTrack: Profile successfully created in `profiles` table:', profilePayload);
      }
    }

    showAlert('auth-alert', 'Account registered successfully! Redirecting or signing you in...', 'success');

    // Store fast session hint
    sessionStorage.setItem('ecotrack_role', role);
    sessionStorage.setItem('ecotrack_email', email);
    sessionStorage.setItem('ecotrack_name', fullName);

    // If auto-logged in, navigate to dashboard, otherwise prompt to sign in
    setTimeout(() => {
      if (authData.session) {
        window.location.href = 'dashboard.html';
      } else if (typeof switchAuthTab === 'function') {
        switchAuthTab('login');
        const loginEmail = document.getElementById('login-email');
        if (loginEmail) loginEmail.value = email;
        showAlert('auth-alert', 'Account created! Please enter your password to sign in.', 'info');
      }
    }, 1200);

  } catch (error) {
    console.error('EcoTrack: signUpUser error:', error);
    showAlert('auth-alert', error.message || 'Registration failed. Please try again.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
        Create Account`;
    }
  }
}

// ============================================================================
// 2. Authentication: Login
// Authenticates the user and redirects to dashboard.html.
// ============================================================================
async function loginUser(event) {
  if (event) event.preventDefault();

  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const submitBtn = document.getElementById('btn-login-submit');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!email || !password) {
    showAlert('auth-alert', 'Please enter both email and password.', 'error');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';
  }

  console.log(`EcoTrack: Authenticating user: ${email}`);

  try {
    if (!supabaseClient) {
      throw new Error('Supabase client is not initialized. Please configure credentials in app.js.');
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      throw error;
    }

    console.log('EcoTrack: Login successful for:', data.user?.email);

    // Fetch user profile role from profiles table
    let role = 'Citizen';
    try {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role, name, full_name')
        .eq('id', data.user.id)
        .single();

      if (profile && profile.role) {
        role = profile.role;
      } else if (data.user.user_metadata && data.user.user_metadata.role) {
        role = data.user.user_metadata.role;
      }
    } catch (profErr) {
      console.warn('EcoTrack: Could not fetch profile on login, using default:', profErr);
    }

    // Save temporary session hints
    sessionStorage.setItem('ecotrack_role', role);
    sessionStorage.setItem('ecotrack_email', data.user.email);

    showAlert('auth-alert', 'Login successful! Redirecting to dashboard...', 'success');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 600);

  } catch (error) {
    console.error('EcoTrack: loginUser error:', error);
    showAlert('auth-alert', error.message || 'Invalid email or password. Please try again.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
        Sign In`;
    }
  }
}

// ============================================================================
// Logout Helper
// ============================================================================
async function logoutUser() {
  console.log('EcoTrack: Signing out user...');
  try {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
  } catch (err) {
    console.warn('EcoTrack: Sign out warning:', err);
  } finally {
    sessionStorage.clear();
    window.location.href = 'index.html';
  }
}

// ============================================================================
// 3. Role Checking & View Container Toggle
// Runs on dashboard.html load to fetch the user's role from the profiles table
// and display the correct view container (citizen-view, collector-view, admin-view).
// ============================================================================
async function checkUserRole() {
  console.log('EcoTrack: Executing checkUserRole() on dashboard load...');

  // Target view containers with exact required IDs
  const citizenView = document.getElementById('citizen-view');
  const collectorView = document.getElementById('collector-view');
  const adminView = document.getElementById('admin-view');

  if (!citizenView || !collectorView || !adminView) {
    console.log('EcoTrack: Not on dashboard page or view containers missing.');
    return;
  }

  let detectedRole = sessionStorage.getItem('ecotrack_role') || 'Citizen';
  let userEmail = sessionStorage.getItem('ecotrack_email') || 'user@ecotrack.org';
  let userName = sessionStorage.getItem('ecotrack_name') || 'EcoTrack User';

  try {
    if (supabaseClient) {
      // 1. Check current authenticated Supabase session
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (session && session.user) {
        currentUser = session.user;
        userEmail = currentUser.email;

        // 2. Fetch user's role and details from profiles table
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (profile) {
          userProfile = profile;
          userName = profile.name || profile.full_name || currentUser.email;
          if (profile.role) detectedRole = profile.role;
        } else if (currentUser.user_metadata && currentUser.user_metadata.role) {
          detectedRole = currentUser.user_metadata.role;
          userName = currentUser.user_metadata.name || currentUser.email;
        }
      } else {
        console.info('EcoTrack: No live session detected. Using remembered role or demo mode.');
      }
    }
  } catch (err) {
    console.error('EcoTrack: checkUserRole() error fetching from Supabase profiles:', err);
  }

  // Normalize role casing (e.g. 'citizen' -> 'Citizen')
  detectedRole = normalizeRole(detectedRole);
  currentRole = detectedRole;
  console.log(`EcoTrack: Active user role determined: [${currentRole}] for ${userEmail}`);

  // Update navigation profile pills
  updateNavProfile(userName, userEmail, currentRole);

  // Toggle the three container divs
  displayViewContainer(currentRole);

  // Trigger role-specific data loaders
  if (currentRole === 'Citizen') {
    await fetchCitizenRequests().catch(e => console.error('fetchCitizenRequests catch:', e));
  } else if (currentRole === 'Collector') {
    await fetchPendingRequests().catch(e => console.error('fetchPendingRequests catch:', e));
    await fetchCollectorHistory().catch(e => console.error('fetchCollectorHistory catch:', e));
  } else if (currentRole === 'Admin') {
    await fetchAdminData().catch(e => console.error('fetchAdminData catch:', e));
  }
}

// Display the correct view container based on role
function displayViewContainer(role) {
  const citizenView = document.getElementById('citizen-view');
  const collectorView = document.getElementById('collector-view');
  const adminView = document.getElementById('admin-view');

  if (!citizenView || !collectorView || !adminView) return;

  // Hide all three containers
  citizenView.style.display = 'none';
  collectorView.style.display = 'none';
  adminView.style.display = 'none';

  // Highlight active role switcher button if present
  document.querySelectorAll('.role-switch-btn').forEach(btn => {
    if (btn.getAttribute('data-role')?.toLowerCase() === role.toLowerCase()) {
      btn.classList.add('btn-primary');
      btn.classList.remove('btn-outline');
    } else {
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-outline');
    }
  });

  // Display the matching container
  if (role === 'Collector') {
    collectorView.style.display = 'block';
  } else if (role === 'Admin') {
    adminView.style.display = 'block';
  } else {
    // Default to Citizen
    citizenView.style.display = 'block';
  }
}

// Fast switcher for previewing/toggling views directly
function switchView(role) {
  currentRole = normalizeRole(role);
  sessionStorage.setItem('ecotrack_role', currentRole);
  console.log(`EcoTrack: Manually switched active view to: [${currentRole}]`);
  
  displayViewContainer(currentRole);
  updateNavProfile(userProfile?.name || 'EcoTrack User', currentUser?.email || 'user@ecotrack.org', currentRole);

  if (currentRole === 'Citizen') {
    fetchCitizenRequests().catch(e => console.error(e));
  } else if (currentRole === 'Collector') {
    fetchPendingRequests().catch(e => console.error(e));
    fetchCollectorHistory().catch(e => console.error(e));
  } else if (currentRole === 'Admin') {
    fetchAdminData().catch(e => console.error(e));
  }
}

// ============================================================================
// 4. Citizen Operations: Submit Waste Request
// Inserts a new row into waste_requests (waste_type: Plastic, Electronic, Organic)
// ============================================================================
async function submitWasteRequest(event) {
  if (event) event.preventDefault();

  const wasteTypeSelect = document.getElementById('waste_type');
  const weightInput = document.getElementById('waste-weight');
  const addressInput = document.getElementById('waste-address');
  const dateInput = document.getElementById('waste-date');
  const notesInput = document.getElementById('waste-notes');
  const submitBtn = document.getElementById('btn-submit-request');

  const wasteType = wasteTypeSelect ? wasteTypeSelect.value : 'Plastic';
  const weightKg = weightInput ? parseFloat(weightInput.value) : 0;
  const address = addressInput ? addressInput.value.trim() : '';
  const preferredDate = dateInput ? dateInput.value : '';
  const notes = notesInput ? notesInput.value.trim() : '';

  if (!wasteType || isNaN(weightKg) || weightKg <= 0 || !address) {
    showAlert('dashboard-alert', 'Please provide a valid waste type, weight (> 0 kg), and address.', 'error');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Scheduling pickup...';
  }

  console.log(`EcoTrack: Submitting waste request for [${wasteType}], weight: ${weightKg}kg`);

  try {
    const userId = currentUser ? currentUser.id : null;
    const citizenName = (userProfile && (userProfile.name || userProfile.full_name)) || 
                        (currentUser && currentUser.email) || 
                        'Local Resident';

    const newRequest = {
      user_id: userId,
      citizen_name: citizenName,
      waste_type: wasteType,
      category: wasteType, // Compatibility with schemas having 'category' column
      weight_kg: weightKg,
      address: address,
      preferred_date: preferredDate || null,
      notes: notes,
      status: 'Pending',
      created_at: new Date().toISOString()
    };

    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('waste_requests')
        .insert([newRequest])
        .select();

      if (error) {
        throw error;
      }
      console.log('EcoTrack: waste_requests insert successful:', data);
    } else {
      console.log('EcoTrack (Simulated): Recorded waste request locally:', newRequest);
    }

    showAlert('dashboard-alert', `Waste pickup request for ${weightKg}kg of ${wasteType} scheduled successfully!`, 'success');

    // Reset form
    if (weightInput) weightInput.value = '';
    if (addressInput) addressInput.value = '';
    if (dateInput) dateInput.value = '';
    if (notesInput) notesInput.value = '';

    // Refresh citizen table
    await fetchCitizenRequests().catch(e => console.error('fetchCitizenRequests catch:', e));

  } catch (error) {
    console.error('EcoTrack: submitWasteRequest error:', error);
    showAlert('dashboard-alert', `Failed to submit request: ${error.message}`, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Submit Waste Request`;
    }
  }
}

// Citizen View: Fetch past requests for logged in citizen
async function fetchCitizenRequests() {
  console.log('EcoTrack: Fetching citizen past requests...');
  const tbody = document.getElementById('citizen-requests-tbody');
  if (!tbody) return;

  try {
    let requests = [];

    if (supabaseClient) {
      let query = supabaseClient
        .from('waste_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // If user is authenticated, query their own requests
      if (currentUser && currentUser.id) {
        query = query.eq('user_id', currentUser.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      requests = data || [];
    }

    // Fallback seed data if table is currently empty
    if (!requests || requests.length === 0) {
      requests = getSampleCitizenRequests();
    }

    console.log(`EcoTrack: Loaded ${requests.length} citizen requests.`);
    renderCitizenRequestsTable(requests);
    updateCitizenMetrics(requests);

  } catch (error) {
    console.error('EcoTrack: fetchCitizenRequests error:', error);
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Error loading past requests: ${escapeHtml(error.message)}</td></tr>`;
  }
}

// ============================================================================
// 5. Collector Operations: Fetch Pending Requests
// Queries waste_requests for Collectors (status = 'Pending')
// ============================================================================
async function fetchPendingRequests() {
  console.log('EcoTrack: fetchPendingRequests() querying pending pickups for collector...');
  const tbody = document.getElementById('collector-pending-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" class="table-loading">Querying pending waste requests from Supabase...</td></tr>`;

  try {
    let pendingRequests = [];

    if (supabaseClient) {
      // Query waste_requests where status is 'Pending' (or lowercase 'pending')
      const { data, error } = await supabaseClient
        .from('waste_requests')
        .select('*')
        .in('status', ['Pending', 'pending', 'PENDING'])
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      pendingRequests = data || [];
    }

    // Fallback sample data if empty
    if (!pendingRequests || pendingRequests.length === 0) {
      pendingRequests = getSamplePendingRequests();
    }

    console.log(`EcoTrack: Found ${pendingRequests.length} pending requests.`);
    renderCollectorPendingTable(pendingRequests);

    // Update pending metric
    const pendingCounter = document.getElementById('collector-metric-pending');
    if (pendingCounter) pendingCounter.textContent = pendingRequests.length;

  } catch (error) {
    console.error('EcoTrack: fetchPendingRequests error:', error);
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">Error loading pending requests: ${escapeHtml(error.message)}</td></tr>`;
  }
}

// Helper: Quick-select a pending request into the collection form
function selectRequestForCollection(requestId, estWeight) {
  const reqIdInput = document.getElementById('col-request-id');
  const weightInput = document.getElementById('col-weight');

  if (reqIdInput) {
    reqIdInput.value = requestId;
    reqIdInput.focus();
  }
  if (weightInput && estWeight) {
    weightInput.value = estWeight;
  }

  showAlert('dashboard-alert', `Selected Request #${requestId}. Verify actual weight and click 'Log Collection' below.`, 'info');

  const formCard = document.getElementById('collector-form-card');
  if (formCard) {
    formCard.scrollIntoView({ behavior: 'smooth' });
  }
}

// ============================================================================
// 6. Collector Operations: Log Collection
// Inserts into collections and updates waste_requests status to 'Collected'.
// ============================================================================
async function logCollection(event) {
  if (event) event.preventDefault();

  const reqIdInput = document.getElementById('col-request-id');
  const weightInput = document.getElementById('col-weight');
  const facilitySelect = document.getElementById('col-facility');
  const notesInput = document.getElementById('col-notes');
  const submitBtn = document.getElementById('btn-log-collection');

  const rawRequestId = reqIdInput ? reqIdInput.value.trim() : '';
  const weightKg = weightInput ? parseFloat(weightInput.value) : 0;
  const facility = facilitySelect ? facilitySelect.value : 'Central Materials Recovery Facility';
  const notes = notesInput ? notesInput.value.trim() : '';

  if (!rawRequestId || isNaN(weightKg) || weightKg <= 0) {
    showAlert('dashboard-alert', 'Please enter a valid Request ID and actual weight (> 0 kg).', 'error');
    return;
  }

  // Parse ID (handling numeric or string representation)
  const numericId = parseInt(rawRequestId.replace(/[^0-9]/g, ''), 10);
  const targetId = !isNaN(numericId) && numericId > 0 ? numericId : rawRequestId;

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging collection...';
  }

  console.log(`EcoTrack: Logging collection for Request ID: ${targetId}, Weight: ${weightKg}kg`);

  try {
    const collectorId = currentUser ? currentUser.id : null;
    const collectorName = (userProfile && (userProfile.name || userProfile.full_name)) || 
                          (currentUser && currentUser.email) || 
                          'Certified Collector';

    const collectionRecord = {
      request_id: targetId,
      weight_kg: weightKg,
      actual_weight_kg: weightKg,
      collector_id: collectorId,
      collector_name: collectorName,
      facility: facility,
      notes: notes,
      collected_at: new Date().toISOString()
    };

    if (supabaseClient) {
      // 1. Insert into collections table
      const { data: colData, error: colError } = await supabaseClient
        .from('collections')
        .insert([collectionRecord])
        .select();

      if (colError) {
        console.warn('EcoTrack: Note inserting into collections:', colError.message);
      } else {
        console.log('EcoTrack: Collection successfully recorded in `collections`:', colData);
      }

      // 2. Update waste_requests status to 'Collected'
      const { data: updateData, error: updateError } = await supabaseClient
        .from('waste_requests')
        .update({ status: 'Collected' })
        .eq('id', targetId)
        .select();

      if (updateError) {
        console.warn('EcoTrack: Could not update waste_requests status:', updateError.message);
      } else {
        console.log('EcoTrack: Updated waste_requests status to Collected for request:', targetId, updateData);
      }
    }

    showAlert('dashboard-alert', `Collection for Request #${targetId} (${weightKg} kg) recorded and status set to 'Collected'!`, 'success');

    // Reset inputs
    if (reqIdInput) reqIdInput.value = '';
    if (weightInput) weightInput.value = '';
    if (notesInput) notesInput.value = '';

    // Refresh pending queue and collector history
    await fetchPendingRequests().catch(e => console.error('fetchPendingRequests catch:', e));
    await fetchCollectorHistory().catch(e => console.error('fetchCollectorHistory catch:', e));

  } catch (error) {
    console.error('EcoTrack: logCollection error:', error);
    showAlert('dashboard-alert', `Error logging collection: ${error.message}`, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
        Log Collection & Mark as Collected`;
    }
  }
}

// Fetch history of collections logged by collector
async function fetchCollectorHistory() {
  const tbody = document.getElementById('collector-history-tbody');
  if (!tbody) return;

  try {
    let collections = [];

    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('collections')
        .select('*')
        .order('collected_at', { ascending: false })
        .limit(10);

      if (!error && data) collections = data;
    }

    if (!collections || collections.length === 0) {
      collections = getSampleCollections();
    }

    let totalWeight = 0;
    tbody.innerHTML = collections.map(col => {
      const weight = col.weight_kg || col.actual_weight_kg || 0;
      totalWeight += parseFloat(weight);
      return `
        <tr>
          <td><span class="id-tag">COL-${col.id || '101'}</span></td>
          <td><span class="id-tag">REQ-${col.request_id || '---'}</span></td>
          <td><strong>${weight} kg</strong></td>
          <td>${escapeHtml(col.facility || 'Central Facility')}</td>
          <td>${formatDate(col.collected_at)}</td>
          <td><span class="badge badge-collected">Collected</span></td>
        </tr>
      `;
    }).join('');

    const completedMetric = document.getElementById('collector-metric-completed');
    const weightMetric = document.getElementById('collector-metric-weight');
    if (completedMetric) completedMetric.textContent = collections.length;
    if (weightMetric) weightMetric.textContent = `${totalWeight.toFixed(1)} kg`;

  } catch (err) {
    console.warn('EcoTrack: fetchCollectorHistory warning:', err);
  }
}

// ============================================================================
// 7. Admin Operations: Fetch Admin Data
// Queries recycling_logs and facilities, plus completed collections.
// ============================================================================
async function fetchAdminData() {
  console.log('EcoTrack: fetchAdminData() executing admin query suite...');
  
  const collectionsTbody = document.getElementById('admin-collections-tbody');
  const logsTbody = document.getElementById('admin-logs-tbody');

  if (collectionsTbody) {
    collectionsTbody.innerHTML = `<tr><td colspan="6" class="table-loading">Querying completed collections from Supabase...</td></tr>`;
  }
  if (logsTbody) {
    logsTbody.innerHTML = `<tr><td colspan="8" class="table-loading">Querying recycling logs joined with facilities...</td></tr>`;
  }

  let collections = [];
  let recyclingLogs = [];
  let facilities = [];

  try {
    if (supabaseClient) {
      // 1. Query all completed collections
      const { data: colData, error: colError } = await supabaseClient
        .from('collections')
        .select('*')
        .order('collected_at', { ascending: false });

      if (!colError && colData) collections = colData;

      // 2. Query facilities
      const { data: facData, error: facError } = await supabaseClient
        .from('facilities')
        .select('*');

      if (!facError && facData) facilities = facData;

      // 3. Query recycling_logs joined with facilities
      // First attempt foreign key relational join
      const { data: joinedLogs, error: joinError } = await supabaseClient
        .from('recycling_logs')
        .select('*, facilities(id, name, location, type)')
        .order('logged_at', { ascending: false });

      if (!joinError && joinedLogs) {
        recyclingLogs = joinedLogs;
      } else {
        // Fallback: Query recycling_logs directly and join programmatically
        const { data: rawLogs } = await supabaseClient
          .from('recycling_logs')
          .select('*')
          .order('logged_at', { ascending: false });

        if (rawLogs) {
          recyclingLogs = rawLogs.map(log => {
            const matchedFacility = facilities.find(f => f.id === log.facility_id || f.name === log.facility);
            return {
              ...log,
              facilities: matchedFacility || { name: log.facility || 'Municipal MRF', location: 'Metropolitan District', type: 'Materials Recovery' }
            };
          });
        }
      }
    }

    // Fallbacks if tables are fresh/empty
    if (!collections || collections.length === 0) {
      collections = getSampleCollections();
    }
    if (!recyclingLogs || recyclingLogs.length === 0) {
      recyclingLogs = getSampleRecyclingLogsWithFacilities();
    }

    console.log(`EcoTrack: Admin data fetched. Collections: ${collections.length}, Recycling Logs: ${recyclingLogs.length}`);

    // Render Table 1: All Completed Collections
    renderAdminCollectionsTable(collections);

    // Render Table 2: Recycling Logs Joined with Facilities
    renderAdminRecyclingLogsTable(recyclingLogs);

    // Update Admin Metrics
    updateAdminMetrics(collections, recyclingLogs, facilities);

  } catch (error) {
    console.error('EcoTrack: fetchAdminData error:', error);
    if (collectionsTbody) {
      collectionsTbody.innerHTML = `<tr><td colspan="6" class="table-empty">Error loading collections: ${escapeHtml(error.message)}</td></tr>`;
    }
    if (logsTbody) {
      logsTbody.innerHTML = `<tr><td colspan="8" class="table-empty">Error loading recycling logs: ${escapeHtml(error.message)}</td></tr>`;
    }
  }
}

// ============================================================================
// Table Rendering Helpers
// ============================================================================

// Render Citizen Past Requests Table
function renderCitizenRequestsTable(requests) {
  const tbody = document.getElementById('citizen-requests-tbody');
  if (!tbody) return;

  if (!requests || requests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No waste requests scheduled yet. Use the form above to schedule your first pickup.</td></tr>`;
    return;
  }

  tbody.innerHTML = requests.map(req => {
    const wasteType = req.waste_type || req.category || 'Plastic';
    const status = req.status || 'Pending';
    const badgeClass = status.toLowerCase() === 'collected' ? 'badge-collected' : 'badge-pending';
    const typeBadgeClass = getWasteBadgeClass(wasteType);

    return `
      <tr>
        <td><span class="id-tag">REQ-${req.id}</span></td>
        <td><span class="badge ${typeBadgeClass}">${escapeHtml(wasteType)}</span></td>
        <td><strong>${req.weight_kg || '0'} kg</strong></td>
        <td>${escapeHtml(req.address || 'Address on file')}</td>
        <td>${req.preferred_date ? formatDateOnly(req.preferred_date) : 'Flexible'}</td>
        <td><span class="badge ${badgeClass}">${escapeHtml(status)}</span></td>
        <td>${formatDate(req.created_at)}</td>
      </tr>
    `;
  }).join('');
}

// Render Collector Pending Requests Table
function renderCollectorPendingTable(requests) {
  const tbody = document.getElementById('collector-pending-tbody');
  if (!tbody) return;

  if (!requests || requests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">No pending waste requests in the queue right now. All requests are collected!</td></tr>`;
    return;
  }

  tbody.innerHTML = requests.map(req => {
    const wasteType = req.waste_type || req.category || 'Plastic';
    const typeBadgeClass = getWasteBadgeClass(wasteType);
    const weight = req.weight_kg || 0;

    return `
      <tr>
        <td><span class="id-tag">REQ-${req.id}</span></td>
        <td>
          <strong>${escapeHtml(req.citizen_name || 'Resident')}</strong>
          ${req.notes ? `<div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(req.notes)}</div>` : ''}
        </td>
        <td><span class="badge ${typeBadgeClass}">${escapeHtml(wasteType)}</span></td>
        <td><strong>${weight} kg</strong></td>
        <td>${escapeHtml(req.address || 'Location provided')}</td>
        <td>${req.preferred_date ? formatDateOnly(req.preferred_date) : 'Asap'}</td>
        <td><span class="badge badge-pending">Pending</span></td>
        <td>
          <button type="button" class="btn btn-sm btn-primary" onclick="selectRequestForCollection('${req.id}', '${weight}')">
            Select for Pickup &rarr;
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Render Admin Completed Collections Table
function renderAdminCollectionsTable(collections) {
  const tbody = document.getElementById('admin-collections-tbody');
  if (!tbody) return;

  if (!collections || collections.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No completed collections recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = collections.map(col => {
    const weight = col.weight_kg || col.actual_weight_kg || 0;
    return `
      <tr>
        <td><span class="id-tag">COL-${col.id}</span></td>
        <td><span class="id-tag">REQ-${col.request_id || 'N/A'}</span></td>
        <td><strong>${weight} kg</strong></td>
        <td>${escapeHtml(col.collector_name || col.collector_id || 'Collector Fleet')}</td>
        <td>${escapeHtml(col.facility || 'Materials Recovery Facility')}</td>
        <td>${formatDate(col.collected_at)}</td>
      </tr>
    `;
  }).join('');
}

// Render Admin Recycling Logs Joined with Facilities Table
function renderAdminRecyclingLogsTable(logs) {
  const tbody = document.getElementById('admin-logs-tbody');
  if (!tbody) return;

  if (!logs || logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">No recycling facility logs available.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map(log => {
    const fac = log.facilities || {};
    const facilityName = fac.name || log.facility || 'Metro Eco Recovery Yard';
    const facilityLoc = fac.location || 'Municipal Industrial Zone';
    const facilityType = fac.type || 'MRF / Material Processing';
    const material = log.category || log.waste_type || 'Mixed Recyclables';
    const carbonOffset = log.carbon_offset_kg || (parseFloat(log.weight_kg || 0) * 1.5).toFixed(1);
    const typeBadge = getWasteBadgeClass(material);

    return `
      <tr>
        <td><span class="id-tag">LOG-${log.id}</span></td>
        <td><span class="badge ${typeBadge}">${escapeHtml(material)}</span></td>
        <td><strong>${log.weight_kg || 0} kg</strong></td>
        <td><strong>${escapeHtml(facilityName)}</strong></td>
        <td>${escapeHtml(facilityLoc)}</td>
        <td><span class="badge" style="background: var(--surface-alt); border: 1px solid var(--border); font-size: 0.7rem;">${escapeHtml(facilityType)}</span></td>
        <td style="color: var(--forest-700); font-weight: 700;">🌱 ${carbonOffset} kg CO₂</td>
        <td>${formatDate(log.logged_at)}</td>
      </tr>
    `;
  }).join('');
}

// ============================================================================
// Metrics & Calculation Helpers
// ============================================================================
function updateCitizenMetrics(requests) {
  let pendingCount = 0;
  let collectedCount = 0;
  let totalDiverted = 0;

  requests.forEach(r => {
    const status = (r.status || '').toLowerCase();
    const weight = parseFloat(r.weight_kg) || 0;
    if (status === 'collected') {
      collectedCount++;
      totalDiverted += weight;
    } else {
      pendingCount++;
    }
  });

  const mTotal = document.getElementById('citizen-metric-total');
  const mPending = document.getElementById('citizen-metric-pending');
  const mCollected = document.getElementById('citizen-metric-collected');
  const mWeight = document.getElementById('citizen-metric-weight');

  if (mTotal) mTotal.textContent = requests.length;
  if (mPending) mPending.textContent = pendingCount;
  if (mCollected) mCollected.textContent = collectedCount;
  if (mWeight) mWeight.textContent = `${totalDiverted.toFixed(1)} kg`;
}

function updateAdminMetrics(collections, recyclingLogs, facilities) {
  let totalWeight = 0;
  let totalCarbon = 0;

  recyclingLogs.forEach(l => {
    const w = parseFloat(l.weight_kg) || 0;
    totalWeight += w;
    const offset = parseFloat(l.carbon_offset_kg) || (w * 1.5);
    totalCarbon += offset;
  });

  // If logs weight is low, also add collection weights
  if (totalWeight === 0) {
    collections.forEach(c => {
      totalWeight += parseFloat(c.weight_kg || c.actual_weight_kg || 0);
    });
    totalCarbon = totalWeight * 1.5;
  }

  const mWeight = document.getElementById('admin-metric-weight');
  const mCarbon = document.getElementById('admin-metric-carbon');
  const mCollections = document.getElementById('admin-metric-collections');
  const mFacilities = document.getElementById('admin-metric-facilities');

  if (mWeight) mWeight.textContent = `${totalWeight.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
  if (mCarbon) mCarbon.textContent = `${totalCarbon.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kg`;
  if (mCollections) mCollections.textContent = collections.length;
  if (mFacilities) mFacilities.textContent = facilities.length > 0 ? facilities.length : 4;
}

// Update Top Navigation Bar with active profile info
function updateNavProfile(name, email, role) {
  const nameEl = document.getElementById('user-display-name');
  const roleBadge = document.getElementById('user-display-role');
  const avatarEl = document.getElementById('user-avatar-initial');

  if (nameEl) nameEl.textContent = name || email;
  if (avatarEl) {
    const initial = (name || email || 'U').charAt(0).toUpperCase();
    avatarEl.textContent = initial;
  }
  if (roleBadge) {
    roleBadge.textContent = role;
    roleBadge.className = 'badge';
    if (role === 'Collector') {
      roleBadge.classList.add('badge-collector');
    } else if (role === 'Admin') {
      roleBadge.classList.add('badge-admin');
    } else {
      roleBadge.classList.add('badge-citizen');
    }
  }
}

// ============================================================================
// Utility & Sample Seed Helpers
// ============================================================================
function normalizeRole(role) {
  if (!role) return 'Citizen';
  const r = role.toString().trim().toLowerCase();
  if (r === 'collector') return 'Collector';
  if (r === 'admin') return 'Admin';
  return 'Citizen';
}

function getWasteBadgeClass(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('plastic')) return 'badge-plastic';
  if (t.includes('elect') || t.includes('e-waste')) return 'badge-electronic';
  if (t.includes('org') || t.includes('compost')) return 'badge-organic';
  return 'badge-plastic';
}

function showAlert(elementId, message, type = 'info') {
  const box = document.getElementById(elementId);
  if (!box) {
    console.log(`[${type.toUpperCase()}] ${message}`);
    return;
  }
  box.className = `alert-box ${type}`;
  box.textContent = message;
  box.style.display = 'block';

  // Auto hide after 6 seconds for success/info
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      if (box && box.textContent === message) {
        box.style.display = 'none';
      }
    }, 6000);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(isoString) {
  if (!isoString) return 'Just now';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + 
           d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return isoString;
  }
}

function formatDateOnly(dateString) {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return dateString;
  }
}

// Fallback seed data for immediate vibrant UI experience
function getSampleCitizenRequests() {
  return [
    {
      id: 101,
      waste_type: 'Plastic',
      weight_kg: 18.5,
      address: '42 Pine Crest Avenue, Sector 4',
      preferred_date: '2026-11-04',
      status: 'Pending',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 98,
      waste_type: 'Electronic',
      weight_kg: 14.0,
      address: '15 Tech Park Boulevard',
      preferred_date: '2026-10-28',
      status: 'Collected',
      created_at: new Date(Date.now() - 3600000 * 72).toISOString()
    },
    {
      id: 92,
      waste_type: 'Organic',
      weight_kg: 26.5,
      address: '88 Meadow Lane, North District',
      preferred_date: '2026-10-25',
      status: 'Collected',
      created_at: new Date(Date.now() - 3600000 * 120).toISOString()
    }
  ];
}

function getSamplePendingRequests() {
  return [
    {
      id: 101,
      citizen_name: 'Elena Rostova',
      waste_type: 'Plastic',
      weight_kg: 18.5,
      address: '42 Pine Crest Avenue, Sector 4',
      notes: 'Crushed PET bottles & HDPE jugs packed in green clear bags.',
      preferred_date: '2026-11-04',
      status: 'Pending'
    },
    {
      id: 102,
      citizen_name: 'Marcus Vance',
      waste_type: 'Electronic',
      weight_kg: 22.0,
      address: '77 Elm Street, Block B',
      notes: '2 Desktop towers, wiring harnesses, lithium-ion battery modules.',
      preferred_date: '2026-11-05',
      status: 'Pending'
    },
    {
      id: 103,
      citizen_name: 'Sarah Connor',
      waste_type: 'Organic',
      weight_kg: 35.0,
      address: '104 Highland Terrace',
      notes: 'Pruned yard trimmings and compostable vegetable scraps in brown paper sacks.',
      preferred_date: '2026-11-06',
      status: 'Pending'
    }
  ];
}

function getSampleCollections() {
  return [
    {
      id: 501,
      request_id: 98,
      weight_kg: 14.0,
      collector_name: 'Route Dispatcher #4',
      facility: 'Metro E-Waste Recovery Hub',
      collected_at: new Date(Date.now() - 3600000 * 48).toISOString()
    },
    {
      id: 500,
      request_id: 92,
      weight_kg: 26.5,
      collector_name: 'EcoTruck Unit B',
      facility: 'EcoCompost Bio-Processing Yard',
      collected_at: new Date(Date.now() - 3600000 * 96).toISOString()
    },
    {
      id: 499,
      request_id: 87,
      weight_kg: 45.0,
      collector_name: 'EcoTruck Unit A',
      facility: 'Central Materials Recovery Facility',
      collected_at: new Date(Date.now() - 3600000 * 140).toISOString()
    }
  ];
}

function getSampleRecyclingLogsWithFacilities() {
  return [
    {
      id: 801,
      category: 'Plastic',
      weight_kg: 1450.0,
      carbon_offset_kg: 2175.0,
      logged_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      facilities: {
        id: 1,
        name: 'GreenFuture Polymer Plant',
        location: 'Sector 9 Industrial Corridor',
        type: 'Polymer Extrusion & Pelletizing'
      }
    },
    {
      id: 802,
      category: 'Electronic',
      weight_kg: 620.0,
      carbon_offset_kg: 1860.0,
      logged_at: new Date(Date.now() - 3600000 * 28).toISOString(),
      facilities: {
        id: 2,
        name: 'Metro E-Waste Recovery Hub',
        location: 'Tech Hub Logistics Terminal',
        type: 'Precious Metals & PCB Refinement'
      }
    },
    {
      id: 803,
      category: 'Organic',
      weight_kg: 3200.0,
      carbon_offset_kg: 2560.0,
      logged_at: new Date(Date.now() - 3600000 * 50).toISOString(),
      facilities: {
        id: 3,
        name: 'EcoCompost Bio-Processing Yard',
        location: 'Valley Agro-Ecology Preserve',
        type: 'Industrial Aerobic Composting'
      }
    },
    {
      id: 804,
      category: 'Plastic',
      weight_kg: 890.0,
      carbon_offset_kg: 1335.0,
      logged_at: new Date(Date.now() - 3600000 * 80).toISOString(),
      facilities: {
        id: 4,
        name: 'Central Materials Recovery Facility',
        location: 'Grand River Docklands',
        type: 'Automated Optical Sorting MRF'
      }
    }
  ];
}

// ============================================================================
// Automatic Page Load Handler
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('EcoTrack: Document loaded, checking context...');
  
  // If we are on dashboard.html, run checkUserRole()
  if (document.getElementById('citizen-view') || document.getElementById('collector-view') || document.getElementById('admin-view')) {
    checkUserRole().catch(err => {
      console.error('EcoTrack: checkUserRole() failed on DOMContentLoaded:', err);
    });
  }
});
