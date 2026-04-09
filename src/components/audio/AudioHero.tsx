const AudioHero = () => (
  <div className="relative py-16 sm:py-24 text-center">
    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
    <div className="relative z-10 max-w-2xl mx-auto px-6">
      <span className="text-primary/60 text-sm tracking-[0.3em] uppercase mb-4 block">
        ☾ Percorsi per il Sogno
      </span>
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bodoni-heading text-foreground mb-4">
        Biblioteca Audio
      </h1>
      <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
        Meditazioni guidate, rituali del sonno e percorsi sonori per accompagnarti
        dolcemente verso il mondo dei sogni.
      </p>
    </div>
  </div>
);

export default AudioHero;
