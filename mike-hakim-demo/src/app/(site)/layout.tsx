import { DemoBanner } from "@/components/site/demo-banner";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Intro } from "@/components/site/intro";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Intro />
      <DemoBanner />
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
