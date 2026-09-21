import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({ icon: Icon, title, description }) {
  return (
    <div>
      <h1 className="font-serif text-3xl font-bold">{title}</h1>
      <p className="mt-1 text-muted-foreground">{description}</p>

      <Card className="mt-6">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="rounded-full bg-accent p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <p className="font-medium">Coming soon</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            We're still building this out. Check back soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
