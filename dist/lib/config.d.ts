import { Analytics } from "firebase/analytics";
declare let firebaseConfig: {
    apiKey: string;
    authDomain: string;
    databaseURL: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
};
declare let analyticsInstance: Analytics;
declare const setFirebaseConfig: (config: typeof firebaseConfig) => Promise<import("firebase/app").FirebaseApp | undefined>;
export { firebaseConfig, setFirebaseConfig, analyticsInstance };
