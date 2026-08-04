import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Clock, Loader2, Mail, MapPin, Phone, Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/shared/reveal";
import { SectionTitle } from "@/components/shared/section-title";
import { ORG } from "@/constants/content";
import { submitContact } from "@/services/mzt-api";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — MZT Apps | Maziltu Tholiban" },
      {
        name: "description",
        content:
          "Reach the Maziltu Tholiban secretariat — visit our office, call, email, or send a message from this page.",
      },
    ],
  }),
  component: ContactPage,
});

const CONTACT_ITEMS = [
  { icon: MapPin, label: "Address", value: ORG.address, href: undefined as string | undefined },
  { icon: Phone, label: "Phone", value: ORG.phone, href: `tel:${ORG.phone.replace(/\s/g, "")}` },
  { icon: Mail, label: "Email", value: ORG.email, href: `mailto:${ORG.email}` },
  { icon: Clock, label: "Hours", value: ORG.hours, href: undefined },
] as const;

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const send = useMutation({
    mutationFn: submitContact,
    onSuccess: () => {
      toast.success("Message sent — thank you, we will get back to you soon.");
      setName("");
      setEmail("");
      setMessage("");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    send.mutate({ nama: name.trim(), email: email.trim(), pesan: message.trim() });
  }

  return (
    <section className="container-page py-20 lg:py-28">
      <Reveal>
        <SectionTitle
          as="h1"
          eyebrow="Contact"
          title="Reach the secretariat"
          description="Questions about membership, events or a new branch? Our team is happy to help."
        />
      </Reveal>

      <div className="mt-14 grid gap-6 lg:grid-cols-5">
        <Reveal className="lg:col-span-2">
          <div className="flex h-full flex-col gap-4 rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
            {CONTACT_ITEMS.map((item) => {
              const content = (
                <>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {item.label}
                  </p>
                  <p className="mt-1 block text-sm font-medium text-foreground hover:text-primary">
                    {item.value}
                  </p>
                </>
              );
              return (
                <div
                  key={item.label}
                  className="flex gap-4 rounded-2xl border border-border/60 p-5"
                >
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <item.icon className="size-5" aria-hidden />
                  </span>
                  <div>{item.href ? <a href={item.href}>{content}</a> : content}</div>
                </div>
              );
            })}
          </div>
        </Reveal>

        <Reveal delay={0.1} className="lg:col-span-3">
          <form
            onSubmit={handleSubmit}
            className="h-full rounded-3xl border border-border/70 bg-card p-6 shadow-soft sm:p-8"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="contact-name" className="text-sm font-medium">
                  Full name
                </label>
                <input
                  id="contact-name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
                  placeholder="you@example.com"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="contact-message" className="text-sm font-medium">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={5}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="mt-2 w-full resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
                  placeholder="How can we help?"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={send.isPending || !name.trim() || !email.trim() || !message.trim()}
              className="mt-6 w-full rounded-full sm:w-auto sm:px-8"
            >
              {send.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
              {send.isPending ? "Sending…" : "Send message"}
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Messages are sent straight to the {ORG.name} secretariat.
            </p>
          </form>
        </Reveal>
      </div>

      <Reveal className="mt-10" delay={0.1}>
        <div
          className="relative overflow-hidden rounded-3xl border border-border bg-surface"
          role="img"
          aria-label="Map placeholder showing the location of Maziltu Tholiban offices"
        >
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,oklch(0.446_0.11_152.5/0.12),transparent)]" />
          <div className="relative flex h-72 flex-col items-center justify-center text-center">
            <MapPin className="size-8 text-primary" aria-hidden />
            <p className="mt-3 font-display text-lg font-semibold">{ORG.name}</p>
            <p className="mt-1 max-w-md px-6 text-sm text-muted-foreground">{ORG.address}</p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
