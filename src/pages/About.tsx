import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sparkles, Heart, Moon, Star, BookOpen, HelpCircle, Send, ChevronRight } from "lucide-react";
import { initScrollAnimations } from "@/utils/gsap-animations";
import jessicaImage from "@/assets/jessica-marin.jpg";
import dreamsHero from "@/assets/dreams-hero.jpg";
import ctaDreams from "@/assets/cta-dreams-universe.jpg";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { motion } from "framer-motion";

const contactFormSchema = z.object({
  name: z.string().trim().min(1, { message: "Il nome è obbligatorio" }).max(100, { message: "Il nome deve essere massimo 100 caratteri" }),
  email: z.string().trim().email({ message: "Inserisci un'email valida" }).max(255, { message: "L'email deve essere massimo 255 caratteri" }),
  subject: z.string().trim().min(1, { message: "L'oggetto è obbligatorio" }).max(200, { message: "L'oggetto deve essere massimo 200 caratteri" }),
  message: z.string().trim().min(10, { message: "Il messaggio deve contenere almeno 10 caratteri" }).max(2000, { message: "Il messaggio deve essere massimo 2000 caratteri" }),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const About = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  useEffect(() => {
    initScrollAnimations();
  }, []);

  const onSubmit = async (values: ContactFormValues) => {
    setIsSubmitting(true);
    try {
      // Encode values for WhatsApp
      const message = `*Nuovo messaggio da Dream's Alchemist*%0A%0A*Nome:* ${encodeURIComponent(values.name)}%0A*Email:* ${encodeURIComponent(values.email)}%0A*Oggetto:* ${encodeURIComponent(values.subject)}%0A%0A*Messaggio:*%0A${encodeURIComponent(values.message)}`;
      
      // Open WhatsApp with pre-filled message (replace with Jessica's number)
      window.open(`https://wa.me/393425855361?text=${message}`, '_blank');
      
      toast.success("Messaggio preparato! Verrai reindirizzato a WhatsApp.");
      form.reset();
    } catch (error) {
      toast.error("Si è verificato un errore. Riprova più tardi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="relative z-10 pt-24" style={{ paddingTop: 'calc(6rem + var(--safe-area-inset-top, 0px))' }}>
        {/* Hero Section */}
        <section className="py-16 md:py-28 bg-background">
          <div className="mx-auto max-w-6xl space-y-2 px-6">
            <img
              className="rounded-xl object-cover w-full h-[240px] md:h-[460px]"
              src={dreamsHero}
              alt="Dream's Alchemist - Il tuo viaggio nei sogni"
            />

            <div className="grid gap-6 md:grid-cols-2 md:gap-12">
              <h1 className="text-3xl md:text-4xl font-semibold leading-snug">
                L'<span className="text-primary">ecosistema</span> Dream's Alchemist{" "}
                <span className="text-muted-foreground">
                  unisce tecnologia, saggezza esoterica e crescita personale.
                </span>
              </h1>
              <div className="space-y-6 text-muted-foreground">
                <p>
                  Dream's Alchemist è più di una semplice app per i sogni. È un ecosistema completo 
                  che supporta il tuo viaggio di auto-conoscenza attraverso strumenti innovativi, 
                  interpretazioni esoteriche e una community globale di sognatori.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1 pr-1.5"
                  onClick={() => document.getElementById('mission')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <span>Scopri di più</span>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-20 md:py-28" id="mission">
          <div className="mx-auto max-w-6xl space-y-16 px-6">
            {/* Header */}
            <div className="grid gap-6 text-center md:grid-cols-2 md:gap-12 md:text-left">
              <h1 className="text-4xl md:text-5xl font-semibold">
                Chi Siamo
              </h1>
              <p className="text-muted-foreground">
                Dream's Alchemist è nato dalla visione di Jessica Marin, Tarologa Esoterista Professionista 
                con oltre 15 anni di esperienza nelle arti divinatorie. Questo strumento innovativo unisce 
                la sua profonda conoscenza esoterica con la tecnologia moderna per offrire interpretazioni 
                personalizzate dei sogni che guidano verso l'auto-conoscenza e la crescita spirituale.
              </p>
            </div>

            {/* Three Cards Layout */}
            <div className="flex flex-col md:flex-row gap-6 mt-16">
              {/* Left Big Image - Jessica */}
              <div className="md:flex-1">
                <img
                  src={jessicaImage}
                  alt="Jessica Marin - Tarologa Esoterista Professionista"
                  className="rounded-xl object-cover w-full h-[300px] sm:h-[360px] md:h-full"
                />
              </div>

              {/* Right Two Cards */}
              <div className="flex flex-col gap-6 md:flex-1">
                {/* First Card - Mission */}
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 250, damping: 20 }}
                  className="relative overflow-hidden rounded-xl bg-black text-white shadow-lg"
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.4 }}
                    className="relative h-60 sm:h-64 md:h-48 w-full overflow-hidden"
                  >
                    <img
                      src={ctaDreams}
                      alt="La Nostra Missione"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute bottom-0 h-32 w-full bg-gradient-to-t from-black via-black/70 to-transparent" />
                  </motion.div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold">La Nostra Missione</h3>
                    <p className="mt-2 text-sm text-gray-300">
                      Trasformare i sogni in preziose opportunità di auto-conoscenza e crescita spirituale 
                      attraverso tecnologia innovativa e saggezza esoterica.
                    </p>
                  </div>
                </motion.div>

                {/* Second Card - Jessica Bio */}
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 250, damping: 20 }}
                  className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 shadow-lg"
                >
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <BookOpen className="h-6 w-6 text-primary" />
                      <h3 className="text-xl font-bold">Jessica Marin</h3>
                    </div>
                    <p className="text-primary font-semibold mb-3">Tarologa Esoterista Professionista</p>
                    <p className="text-sm text-muted-foreground">
                      Con oltre 15 anni di esperienza nel campo delle arti divinatorie e dell'interpretazione 
                      simbolica, Jessica unisce la tradizione esoterica con la tecnologia moderna per rendere 
                      accessibili a tutti gli strumenti di auto-conoscenza.
                    </p>
                  </div>
                </motion.div>
              </div>
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

        {/* Contact Form Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                  <Send className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-4">Contatta Jessica Marin</h2>
                <p className="text-muted-foreground">Hai domande sui tuoi sogni o vuoi approfondire l'interpretazione esoterica? Invia un messaggio a Jessica.</p>
              </div>

              <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
                <CardContent className="p-6 lg:p-8">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome *</FormLabel>
                            <FormControl>
                              <Input placeholder="Il tuo nome" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="tua@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Oggetto *</FormLabel>
                            <FormControl>
                              <Input placeholder="Di cosa vuoi parlare?" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Messaggio *</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Scrivi qui il tuo messaggio per Jessica..."
                                className="min-h-[150px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={isSubmitting}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {isSubmitting ? "Invio in corso..." : "Invia Messaggio"}
                      </Button>
                    </form>
                  </Form>
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
