import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  type Auth,
  type UserCredential,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore, type Firestore } from 'firebase/firestore';

interface AppletFirebaseConfig extends FirebaseOptions {
  firestoreDatabaseId?: string;
}

// Safely load firebase-applet-config.json if present in the repository (AI Studio or GitHub).
// Using import.meta.glob prevents Rollup/Vite build failures on Vercel if the JSON file was omitted.
const appletConfigModules = import.meta.glob('../firebase-applet-config.json', {
  eager: true,
  import: 'default',
}) as Record<string, AppletFirebaseConfig>;

const bundledConfig: AppletFirebaseConfig =
  appletConfigModules['../firebase-applet-config.json'] ?? {};

function pickConfigValue(envVal: string | undefined, fileVal: string | undefined): string {
  const trimmedEnv = envVal?.trim();
  if (trimmedEnv) return trimmedEnv;
  const trimmedFile = fileVal?.trim();
  if (trimmedFile && trimmedFile !== 'remixed-project-id') return trimmedFile;
  return '';
}

const resolvedProjectId = pickConfigValue(
  import.meta.env.VITE_FIREBASE_PROJECT_ID,
  bundledConfig.projectId
);

export const resolvedFirebaseConfig: Required<
  Pick<AppletFirebaseConfig, 'apiKey' | 'authDomain' | 'projectId' | 'appId'>
> & {
  storageBucket: string;
  messagingSenderId: string;
  firestoreDatabaseId: string;
} = {
  apiKey: pickConfigValue(import.meta.env.VITE_FIREBASE_API_KEY, bundledConfig.apiKey),
  authDomain:
    pickConfigValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, bundledConfig.authDomain) ||
    (resolvedProjectId ? `${resolvedProjectId}.firebaseapp.com` : ''),
  projectId: resolvedProjectId,
  appId: pickConfigValue(import.meta.env.VITE_FIREBASE_APP_ID, bundledConfig.appId),
  storageBucket: pickConfigValue(
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    bundledConfig.storageBucket
  ),
  messagingSenderId: pickConfigValue(
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    bundledConfig.messagingSenderId
  ),
  firestoreDatabaseId:
    pickConfigValue(
      import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
      bundledConfig.firestoreDatabaseId
    ) || '(default)',
};

export const isFirebaseConfigured: boolean = Boolean(
  resolvedFirebaseConfig.apiKey &&
    resolvedFirebaseConfig.projectId &&
    resolvedFirebaseConfig.authDomain
);

const app: FirebaseApp | null = isFirebaseConfigured
  ? initializeApp(resolvedFirebaseConfig)
  : null;

export const db: Firestore = app
  ? resolvedFirebaseConfig.firestoreDatabaseId &&
    resolvedFirebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, resolvedFirebaseConfig.firestoreDatabaseId)
    : getFirestore(app)
  : (null as unknown as Firestore);

export const auth: Auth = app ? getAuth(app) : (null as unknown as Auth);

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

if (isFirebaseConfigured && auth && typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    setPersistence(auth, browserSessionPersistence).catch(() => {
      // Ignore persistence fallback errors in restricted storage contexts
    });
  });
}

export function isRunningInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export async function signInWithGooglePopup(): Promise<UserCredential> {
  return signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
}

export async function signInWithGoogleRedirect(): Promise<void> {
  await signInWithRedirect(auth, googleProvider, browserPopupRedirectResolver);
}

export async function checkGoogleRedirectResult(): Promise<UserCredential | null> {
  if (!isFirebaseConfigured) return null;
  return getRedirectResult(auth, browserPopupRedirectResolver);
}

export interface ParsedAuthError {
  code: string;
  isIgnoredCancel: boolean;
  isUnauthorizedDomain: boolean;
  isPopupBlocked: boolean;
  isInvalidConfig: boolean;
  message: string;
  hostname: string;
}

export function parseFirebaseAuthError(err: unknown): ParsedAuthError {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const code =
    err && typeof err === 'object' && 'code' in err && typeof (err as { code?: unknown }).code === 'string'
      ? (err as { code: string }).code
      : '';
  const rawMessage = err instanceof Error ? err.message : String(err);

  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    rawMessage.includes('auth/popup-closed-by-user') ||
    rawMessage.includes('auth/cancelled-popup-request')
  ) {
    return {
      code: code || 'auth/popup-closed-by-user',
      isIgnoredCancel: true,
      isUnauthorizedDomain: false,
      isPopupBlocked: false,
      isInvalidConfig: false,
      message: '',
      hostname,
    };
  }

  if (code === 'auth/unauthorized-domain' || rawMessage.includes('auth/unauthorized-domain')) {
    return {
      code: 'auth/unauthorized-domain',
      isIgnoredCancel: false,
      isUnauthorizedDomain: true,
      isPopupBlocked: false,
      isInvalidConfig: false,
      message: `Domain "${hostname}" belum didaftarkan pada daftar Authorized Domains di Firebase Authentication.`,
      hostname,
    };
  }

  if (
    code === 'auth/popup-blocked' ||
    code === 'auth/operation-not-supported-in-this-environment' ||
    rawMessage.includes('auth/popup-blocked')
  ) {
    return {
      code: code || 'auth/popup-blocked',
      isIgnoredCancel: false,
      isUnauthorizedDomain: false,
      isPopupBlocked: true,
      isInvalidConfig: false,
      message:
        'Jendela popup Google diblokir oleh peramban. Silakan izinkan popup atau gunakan tombol Masuk via Pengalihan Halaman (Redirect).',
      hostname,
    };
  }

  if (
    code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.' ||
    code === 'auth/invalid-api-key' ||
    rawMessage.includes('api-key-not-valid') ||
    rawMessage.includes('invalid-api-key')
  ) {
    return {
      code: code || 'auth/invalid-api-key',
      isIgnoredCancel: false,
      isUnauthorizedDomain: false,
      isPopupBlocked: false,
      isInvalidConfig: true,
      message:
        'Konfigurasi Firebase API Key tidak ditemukan atau tidak valid pada deployment ini. Pastikan berkas firebase-applet-config.json ikut terunggah ke GitHub atau variabel VITE_FIREBASE_* telah diatur di Vercel.',
      hostname,
    };
  }

  return {
    code: code || 'auth/unknown',
    isIgnoredCancel: false,
    isUnauthorizedDomain: false,
    isPopupBlocked: false,
    isInvalidConfig: false,
    message: `Gagal masuk dengan akun Google (${code || 'kesalahan autentikasi'}). Silakan coba kembali.`,
    hostname,
  };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: boolean | string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (!isFirebaseConfigured) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();
