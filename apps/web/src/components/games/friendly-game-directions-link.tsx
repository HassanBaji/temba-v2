import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";

export function FriendlyGameDirectionsLink({ href }: { href: string }) {
  const m = useMessages();
  return (
    <Button variant="link" size="sm" asChild className="h-auto min-h-0 px-0">
      <a href={href} target="_blank" rel="noopener noreferrer">
        {m.webGame.directions}
      </a>
    </Button>
  );
}
