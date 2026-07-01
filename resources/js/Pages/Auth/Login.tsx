import { useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import { motion } from "motion/react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Login() {
  const { data, setData, post, processing, errors } = useForm({
    email: "",
    password: "",
    remember: false,
  });
  const [showPassword, setShowPassword] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post("/login");
  };

  return (
    <div className="min-h-screen bg-navy-800 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-sm">
        <div className="glass-card p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-emerald-500/20 mb-4 animate-bounce">
              E
            </div>
            <h1 className="text-xl font-bold text-white tracking-wider">EARNNOVA</h1>
            <p className="text-sm text-slate-400 mt-1 font-medium">Premium Earning Platform</p>
          </div>

          {errors.email && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              ⚠️ {errors.email}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4 text-left">
            <div>
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input type="email" value={data.email} onChange={e => setData("email", e.target.value)}
                  placeholder="your@email.com" className="glass-input pl-10" required />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input type={showPassword ? "text" : "password"} value={data.password}
                  onChange={e => setData("password", e.target.value)} placeholder="••••••••"
                  className="glass-input pl-10 pr-10" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer hover:text-slate-300 transition-colors">
                <input type="checkbox" checked={data.remember} onChange={e => setData("remember", e.target.checked)}
                  className="rounded bg-white/5 border-white/10 checked:bg-emerald-500" />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-emerald-500 hover:text-emerald-400 transition-colors font-medium">
                Forgot password?
              </Link>
            </div>
            <button type="submit" disabled={processing}
              className={cn("btn-primary w-full flex items-center justify-center gap-2", processing && "opacity-60 cursor-not-allowed")}>
              {processing ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">Sign In <ArrowRight className="w-4 h-4" /></span>
              )}
            </button>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-white/5" />
            <span className="px-4 text-xs text-slate-500 font-medium">or</span>
            <div className="flex-1 border-t border-white/5" />
          </div>

          <p className="text-sm text-slate-400">
            No account?{" "}
            <Link href="/register" className="text-emerald-500 font-semibold hover:text-emerald-400 transition-colors">
              Sign Up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
