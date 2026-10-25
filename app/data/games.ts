export type GameCategory = "SHOOTER" | "PUZZLE";
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
  {
    id: "tetris",
    title: "TETRIS",
    short: "Encaja las piezas y completa líneas antes de llegar arriba.",
    long: "Las piezas caen cada vez más rápido: muévelas, rótalas y encájalas para completar filas y borrarlas. Combina varias líneas a la vez para multiplicar los puntos. Desde el nivel 6 aparece la tuerca, una pieza en anillo que complica el apilado.",
    cat: "PUZZLE",
    cover: "cover-tetris",
    color: "magenta",
  },
];

export const CATS: ("TODOS" | GameCategory)[] = ["TODOS", "SHOOTER", "PUZZLE"];
