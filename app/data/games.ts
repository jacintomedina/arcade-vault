export type GameCategory = "SHOOTER";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
}

export const GAMES: Game[] = [
  {
    id: "asteroides",
    title: "ASTEROIDES",
    short: "Rota, empuja y dispara entre rocas a la deriva.",
    long: "Tu nave flota sin fricción: un empujón y no hay quien la frene. Dispara a las rocas para partirlas en fragmentos más pequeños y rápidos, recoge el disparo triple y sobrevive a oleadas cada vez más numerosas.",
    cat: "SHOOTER",
    cover: "cover-asteroides",
    color: "cyan",
  },
];

export const CATS: ("TODOS" | GameCategory)[] = ["TODOS", "SHOOTER"];
