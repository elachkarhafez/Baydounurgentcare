import { DemoBar } from "@/components/site/demo-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Intro } from "@/components/site/intro";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Intro />
      <DemoBar />
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
