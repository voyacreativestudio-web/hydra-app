export default function PendingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#c0dde0] mb-4">
          <span className="text-[#1a1a1a] text-xl font-bold tracking-widest">H</span>
        </div>
        <h1 className="text-2xl font-bold tracking-widest text-[#1a1a1a] uppercase mb-10">
          Hydra
        </h1>

        <div className="bg-white border border-[#1a1a1a]/8 rounded-2xl p-6 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#f2d3a3]/50 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          <h2 className="text-base font-semibold text-[#1a1a1a] mb-2">Account in attesa</h2>
          <p className="text-sm text-[#1a1a1a]/50 leading-relaxed">
            Il tuo account è in attesa di approvazione.
            <br />
            Contatta il tuo HR.
          </p>

          <a
            href="/dashboard"
            className="block w-full py-3 px-6 bg-[#1a1a1a] text-white text-sm font-semibold rounded-xl hover:bg-[#333] transition-colors mt-4"
          >
            Riprova
          </a>

          <form action="/api/auth/signout" method="POST" className="mt-3">
            <button
              type="submit"
              className="w-full py-3 px-6 bg-white text-[#1a1a1a]/50 text-sm font-medium rounded-xl border border-[#1a1a1a]/10 hover:border-[#1a1a1a]/20 hover:text-[#1a1a1a] transition-all"
            >
              Esci e rientra
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
