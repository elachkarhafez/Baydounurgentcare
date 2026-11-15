import { Hero } from "@/components/home/hero";
import { Featured, Why, How, Cta } from "@/components/home/sections";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Featured />
      <Why />
      <How />
      <Cta />
    </>
  );
}
