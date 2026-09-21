import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="min-h-screen bg-background">
      <section className="booking-hero text-center">
        <p className="eyebrow light mx-auto">PLAN YOUR ESCAPE</p>
        <h1 className="mx-auto mt-3 max-w-4xl font-serif text-5xl text-primary-foreground sm:text-7xl">
          Your next story
          <br />
          <em>starts here.</em>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-primary-foreground/75">
          Track the Big Five across sweeping golden plains, with intimate camp stays and expert
          local guides.
        </p>
        <Link
          to="/tours"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-accent px-6 py-4 font-semibold text-accent-foreground transition hover:bg-accent/90"
        >
          Explore tours
        </Link>
      </section>
    </main>
  );
}
