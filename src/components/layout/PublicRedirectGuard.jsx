// src/components/layout/PublicRedirectGuard.jsx
import { useEffect } from "react";
import { redirectIfAlreadyLoggedIn } from "../../lib/layout.js";

export default function PublicRedirectGuard() {
  useEffect(() => {
    redirectIfAlreadyLoggedIn();
  }, []);

  return null;
}
