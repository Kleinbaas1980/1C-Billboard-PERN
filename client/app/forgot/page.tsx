"use client";

import { useAuth } from "@/contexts/auth-context";
import { authApi } from "@/services/auth";
import { apiError, apiRequest } from "@/services/http";
import { useState } from "react";

export default function forgot() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const { loading } = useAuth();
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      setMessage(await authApi.forgotPassword(email));
    } catch (error) {
      setMessage(apiError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="access-page">
      <img
        src="/1c-logo.png"
        width="150"
        alt="1C empowered by 1 crew 1 project"
      />
      <h1>Forgot password</h1>

      <label>
        Email
        <input
          required
          type="email"
          value={email}
          placeholder="Email "
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <p> {message}</p>
      <button type="submit" className="primary">
        {busy ? "Sending" : "Send reset email"}
      </button>
    </form>
  );
}
