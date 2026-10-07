import type { Metadata } from "next";
import { HallOfFame } from "../_components/hall-of-fame";

export const metadata: Metadata = {
  title: "Salón de la Fama",
  description: "Los mejores puntajes de cada juego del Vault.",
};

export default function HallPage() {
  return <HallOfFame />;
}
