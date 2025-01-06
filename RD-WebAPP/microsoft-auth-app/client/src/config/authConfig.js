export const msalConfig = {
  auth: {
    clientId: "4f97959d-fbe9-4911-9f1b-e425218d5fb4",
    authority: "https://login.microsoftonline.com/955ed657-dd5f-490b-8a55-5abaa73481f2",
    redirectUri: "http://localhost:3000",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  }
};

export const loginRequest = {
  scopes: ["User.Read", "profile", "email"]
};
