import { deleteApp, getApp, getApps, initializeApp } from "firebase/app";
import { Analytics, getAnalytics, isSupported } from "firebase/analytics";

let firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: "",
};

let analyticsInstance: Analytics;

const inizialize = () => {
  if (firebaseConfig?.apiKey) {
    const app = initializeApp(firebaseConfig);
    isSupported().then((supported) => {
      if (supported) analyticsInstance = getAnalytics(app);
    });
    return app;
  }
};

const setFirebaseConfig = async (config: typeof firebaseConfig) => {
  firebaseConfig = config;

  if (getApps().length) {
    await deleteApp(getApp());
  }
  return inizialize();
};

export { firebaseConfig, setFirebaseConfig, analyticsInstance };
