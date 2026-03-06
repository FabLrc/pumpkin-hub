import { Upload } from "lucide-react";
import { Button } from "@/components/ui";

export function CtaSection() {
  return (
    <section className="border-t border-border-default">
      <div className="max-w-7xl mx-auto px-6 py-20 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="font-raleway font-black text-4xl text-text-primary mb-3">
            Ready to build?
          </h2>
          <p className="font-raleway text-text-dim">
            Publish your plugin in minutes. The community is waiting.
          </p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <Button variant="ghost" href="/explorer" className="text-sm px-6 py-3">
            Browse Plugins
          </Button>
          <Button href="#" className="text-sm px-6 py-3">
            Publish a Plugin <Upload className="w-[14px] h-[14px]" />
          </Button>
        </div>
      </div>
    </section>
  );
}
