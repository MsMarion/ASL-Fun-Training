"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { motion, AnimatePresence } from "framer-motion";

export default function SignInPage() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [heroName, setHeroName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const registerMutation = api.user.register.useMutation({
    onSuccess: async () => {
      // Auto-login after successful registration
      await handleAuth();
    },
    onError: (err) => {
      setError(err.message);
      setLoading(false);
    },
  });

  const handleAuth = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setLoading(true);

    if (isRegistering) {
      registerMutation.mutate({ email, password, heroName });
    } else {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setLoading(false);
      } else {
        router.push("/songselection");
        router.refresh();
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden"
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          boxShadow: "0 0 40px rgba(168, 85, 247, 0.2)",
        }}
      >
        {/* Glow Effects */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50" />
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-fuchsia-600/20 blur-[80px] rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-600/20 blur-[80px] rounded-full" />

        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
            {isRegistering ? "CREATE HERO" : "SIGN IN"}
          </h1>
          <p className="text-purple-200/60 text-sm font-mono">
            {isRegistering ? "Register your new identity" : "Welcome back, Hero"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <AnimatePresence>
            {isRegistering && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                <label className="text-[10px] text-fuchsia-300 uppercase tracking-[3px] ml-1 font-bold">
                  Hero Name
                </label>
                <input
                  type="text"
                  required={isRegistering}
                  value={heroName}
                  onChange={(e) => setHeroName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all placeholder:text-white/10"
                  placeholder="e.g. SignMaster"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <label className="text-[10px] text-fuchsia-300 uppercase tracking-[3px] ml-1 font-bold">
              Login Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all placeholder:text-white/10"
              placeholder="hero@asl.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-fuchsia-300 uppercase tracking-[3px] ml-1 font-bold">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all placeholder:text-white/10"
              placeholder="••••••••"
            />
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-red-400 text-xs text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full relative group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-xl blur-[2px] group-hover:blur-[8px] transition-all" />
            <div className="relative bg-gradient-to-r from-fuchsia-500 to-purple-600 py-4 rounded-xl text-white font-bold tracking-widest flex items-center justify-center overflow-hidden">
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isRegistering ? "REGISTER" : "ENTER GAME"
              )}
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </div>
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
            }}
            className="text-xs text-cyan-300 hover:text-white transition-colors underline underline-offset-4 decoration-cyan-300/30"
          >
            {isRegistering ? "Already have an account? Sign In" : "Need an account? Register Now"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
