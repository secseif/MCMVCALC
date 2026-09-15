"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthModal({ onAuthenticated, onClose }) {
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "login") {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        onAuthenticated(data.session);
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          // Confirmação de e-mail desligada no projeto Supabase: já entra logado.
          onAuthenticated(data.session);
        } else {
          // Confirmação de e-mail ligada (padrão do Supabase): avisa para checar a caixa de entrada.
          setMessage(
            "Conta criada! Confira seu e-mail para confirmar o cadastro e depois faça login."
          );
          setMode("login");
        }
      }
    } catch (e) {
      setError(traduzErro(e.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h2>{mode === "login" ? "Entrar na sua conta" : "Criar uma conta"}</h2>
        <p>
          Pagamento confirmado. Para manter o acesso liberado, entre com seu
          e-mail e senha{mode === "signup" ? " e crie sua conta" : ""}.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            E-mail
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mínimo 6 caracteres"
            />
          </label>

          {error && <p className="modal-error">{error}</p>}
          {message && <p className="modal-info">{message}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={loading}>
              Agora não
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading
                ? "Enviando…"
                : mode === "login"
                ? "Entrar"
                : "Criar conta"}
            </button>
          </div>
        </form>

        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError("");
            setMessage("");
          }}
        >
          {mode === "login"
            ? "Ainda não tenho conta — criar agora"
            : "Já tenho conta — entrar"}
        </button>
      </div>
    </div>
  );
}

function traduzErro(msg) {
  if (!msg) return "Não foi possível concluir. Tente de novo.";
  if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (msg.includes("User already registered")) return "Este e-mail já tem cadastro. Tente entrar.";
  if (msg.includes("Password should be at least")) return "A senha precisa ter pelo menos 6 caracteres.";
  return msg;
}
