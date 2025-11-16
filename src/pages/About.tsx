import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sparkles, Heart, Moon, Star, BookOpen, HelpCircle } from "lucide-react";
import { initScrollAnimations } from "@/utils/gsap-animations";
import jessicaImage from "@/assets/jessica-marin.jpg";

const About = () => {
  useEffect(() => {
    initScrollAnimations();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="relative z-10 pt-24" style={{ paddingTop: 'calc(6rem + var(--safe-area-inset-top, 0px))' }}>
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-primary/10 via-secondary/5 to-background">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-primary/70 rounded-full mb-6">
                <Moon className="h-10 w-10 text-primary-foreground" />
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 text-foreground">
                Chi Siamo
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Benvenuto nel mondo di Dream's Alchemist, dove i sogni diventano strumenti di crescita personale e consapevolezza.
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
                <CardContent className="p-8 lg:p-12">
                  <div className="flex items-center gap-3 mb-6">
                    <Sparkles className="h-8 w-8 text-primary" />
                    <h2 className="text-3xl font-bold text-foreground">La Nostra Missione</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    <p className="text-lg">
                      Dream's Alchemist nasce dalla visione di trasformare i sogni in preziose opportunità di auto-conoscenza e crescita spirituale. Crediamo che ogni sogno sia un messaggio dell'inconscio, una porta verso la comprensione profonda di noi stessi.
                    </p>
                    <p className="text-lg">
                      La nostra piattaforma unisce tecnologia moderna e saggezza antica, offrendo strumenti intuitivi per registrare, analizzare e comprendere il linguaggio simbolico dei sogni. Attraverso l'intelligenza artificiale e l'interpretazione esoterica, aiutiamo le persone a decifrare i messaggi nascosti nei loro viaggi notturni.
                    </p>
                    <p className="text-lg">
                      Oltre al percorso personale, Dream's Alchemist contribuisce a una ricerca globale sui pattern onirici collettivi, creando un atlante dei sogni dell'umanità che può rivelare connessioni profonde tra le esperienze oniriche di persone in tutto il mondo.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Jessica Marin Bio Section */}
        <section className="py-16 bg-gradient-to-b from-secondary/5 to-background">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50 overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-3 gap-8">
                    {/* Jessica's Photo */}
                    <div className="md:col-span-1 flex items-center justify-center p-8">
                      <img 
                        src={jessicaImage} 
                        alt="Jessica Marin - Tarologa Esoterista Professionista" 
                        className="w-full h-auto rounded-lg shadow-lg object-cover"
                      />
                    </div>
                    
                    {/* Bio Content */}
                    <div className="md:col-span-2 p-8 lg:p-12">
                      <div className="flex items-center gap-3 mb-4">
                        <BookOpen className="h-6 w-6 text-primary" />
                        <h2 className="text-3xl font-bold text-foreground">Jessica Marin</h2>
                      </div>
                      <p className="text-primary font-semibold mb-6">Tarologa Esoterista Professionista</p>
                      
                      <div className="space-y-4 text-muted-foreground leading-relaxed">
                        <p>
                          Jessica Marin è una tarologa esoterista professionista con oltre 15 anni di esperienza nel campo delle arti divinatorie e dell'interpretazione simbolica. La sua passione per il mondo onirico nasce dall'incontro tra la tradizione esoterica e il desiderio di rendere accessibili a tutti gli strumenti di auto-conoscenza.
                        </p>
                        <p>
                          Specializzata nell'interpretazione dei tarocchi e dei sogni, Jessica ha dedicato la sua vita allo studio dei simboli archetipici e del loro significato profondo. La sua approccio unico combina la saggezza antica delle tradizioni esoteriche con una sensibilità moderna e inclusiva.
                        </p>
                        <p>
                          Con Dream's Alchemist, Jessica realizza il suo sogno di creare uno spazio dove chiunque possa esplorare il proprio universo interiore attraverso i sogni, guidato da tecnologia innovativa e dalla profonda comprensione del linguaggio simbolico che caratterizza il suo lavoro.
                        </p>
                        <p className="italic text-sm pt-4 border-t border-border">
                          "Ogni sogno è un'alchimia dell'anima, una trasformazione che ci guida verso la nostra verità più autentica." - Jessica Marin
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12 text-foreground">I Nostri Valori</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
                  <CardContent className="p-6 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                      <Heart className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-foreground">Autenticità</h3>
                    <p className="text-muted-foreground text-sm">
                      Crediamo nella genuinità del percorso onirico di ognuno e rispettiamo l'unicità di ogni esperienza.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
                  <CardContent className="p-6 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-foreground">Trasformazione</h3>
                    <p className="text-muted-foreground text-sm">
                      Supportiamo la crescita personale attraverso la comprensione dei messaggi onirici.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
                  <CardContent className="p-6 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                      <Moon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-foreground">Connessione</h3>
                    <p className="text-muted-foreground text-sm">
                      Creiamo ponti tra il conscio e l'inconscio, tra l'individuo e il collettivo.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-gradient-to-b from-background to-secondary/5">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                  <HelpCircle className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-4">Domande Frequenti</h2>
                <p className="text-muted-foreground">Trova le risposte alle domande più comuni su Dream's Alchemist</p>
              </div>

              <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
                <CardContent className="p-6">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger className="text-left">
                        Come funziona l'interpretazione dei sogni?
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        Dream's Alchemist utilizza l'intelligenza artificiale combinata con la saggezza esoterica per analizzare i simboli e i temi presenti nei tuoi sogni. Il sistema considera il contesto personale, le emozioni e gli archetipi universali per offrirti un'interpretazione personalizzata e significativa.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-2">
                      <AccordionTrigger className="text-left">
                        I miei sogni sono privati e sicuri?
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        Sì, la tua privacy è la nostra priorità. Tutti i sogni che registri sono criptati e visibili solo a te. Puoi scegliere di rendere alcuni sogni pubblici per contribuire alla ricerca collettiva, ma questo è completamente opzionale e sotto il tuo controllo.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-3">
                      <AccordionTrigger className="text-left">
                        Posso usare l'app anche senza connessione internet?
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        Dream's Alchemist è una Progressive Web App (PWA) che funziona parzialmente offline. Puoi visualizzare i tuoi sogni salvati e navigare nell'interfaccia senza connessione. Per salvare nuovi sogni o generare interpretazioni, avrai bisogno di una connessione internet.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-4">
                      <AccordionTrigger className="text-left">
                        Come posso registrare un sogno rapidamente al risveglio?
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        Puoi utilizzare la funzione di registrazione vocale per catturare rapidamente i dettagli del tuo sogno appena ti svegli. L'app trascriverà automaticamente la tua nota vocale, permettendoti di preservare i ricordi onirici prima che svaniscano. In alternativa, puoi salvare una bozza e completarla in seguito.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-5">
                      <AccordionTrigger className="text-left">
                        Cosa sono le collezioni di sogni?
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        Le collezioni ti permettono di organizzare i tuoi sogni per temi, periodi o qualsiasi categoria che ritieni significativa. Ad esempio, puoi creare collezioni per sogni ricorrenti, sogni premonitori, o sogni legati a un particolare periodo della tua vita. Questo ti aiuta a identificare pattern e connessioni nel tempo.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-6">
                      <AccordionTrigger className="text-left">
                        Come funzionano le notifiche promemoria?
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        Puoi impostare notifiche giornaliere personalizzate che ti ricordano di registrare i tuoi sogni. Scegli l'orario che preferisci nelle impostazioni. Le notifiche sono progettate per aiutarti a costruire l'abitudine di documentare regolarmente i tuoi sogni, migliorando così la tua capacità di ricordarli.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-7">
                      <AccordionTrigger className="text-left">
                        Cos'è la ricerca collettiva sui sogni?
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        Dream's Alchemist contribuisce a mappare i pattern onirici globali analizzando (in forma anonima) i temi e simboli ricorrenti nei sogni degli utenti che scelgono di partecipare. Questo ci aiuta a comprendere meglio gli archetipi universali e le connessioni tra le esperienze oniriche umane. La partecipazione è volontaria e puoi decidere sogno per sogno cosa condividere.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default About;
