import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { app } from './firebase';

const auth = getAuth(app);

// Keep the provider scoped for Google Sheets
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize auth listener
export const initSheetsAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Sheets Permission
export const signInWithGoogleSheets = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isSigningIn) return null;
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google Sign-In.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Sheets OAuth error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getSheetsAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const clearSheetsAuth = async () => {
  cachedAccessToken = null;
};

/**
 * Creates a brand new Google Sheet with headers and data rows, returning the direct spreadsheet URL.
 */
export async function createAndExportGoogleSheet(
  accessToken: string,
  title: string,
  headers: string[],
  rows: any[][]
): Promise<string> {
  // 1. Create spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: title
      }
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create spreadsheet: ${errText}`);
  }

  const spreadsheet = await createRes.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl;

  // 2. Populate values
  const values = [headers, ...rows];
  const range = 'Sheet1!A1';

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: values
      })
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Failed to write values into sheet: ${errText}`);
  }

  return spreadsheetUrl;
}

/**
 * Fetches values from a specific Spreadsheet ID and Range.
 */
export async function fetchGoogleSheetValues(
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<any[][]> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to load Google Sheet: ${errText}`);
  }

  const data = await res.json();
  return data.values || [];
}
