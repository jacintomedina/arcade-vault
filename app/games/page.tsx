import type { Metadata } from "next";
import { Library } from "../_components/library";

export const metadata: Metadata = {
  title: "Biblioteca",
  description: "Todos los juegos del Vault, listos para jugar en tu navegador.",
};

export default function GamesPage() {
  return <Library />;
}
