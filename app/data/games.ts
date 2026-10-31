export type GameCategory = "SHOOTER" | "PUZZLE" | "ARCADE";
// Color por categoría: SHOOTER=cyan, PUZZLE=magenta, ARCADE=yellow. Categoría nueva=green.
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
  {
    id: "arkanoid",
    title: "ARKANOID",
    short: "Rompe todos los bloques con la bola y no la dejes caer.",
    long: "Mueve la pala, lanza la bola y derriba el muro bloque a bloque. El punto donde la bola toca la pala decide su ángulo: golpea con el borde para cruzar la pantalla. Tienes 3 vidas y 10 niveles, y la bola gana velocidad en cada uno.",
    cat: "ARCADE",
    cover: "cover-arkanoid",
    color: "yellow",
  },
  {
    id: "snake",
    title: "SNAKE",
    short: "Come fruta, crece y no te muerdas la cola.",
    long: "Guía a la serpiente por el tablero y come la fruta que aparece para crecer. Las paredes no te detienen: sales por un lado y vuelves a entrar por el contrario. Cada 5 frutas subes de nivel y la serpiente va más rápido. Si te muerdes el cuerpo, se acabó.",
    cat: "ARCADE",
    cover: "cover-snake",
    color: "yellow",
  },
  {
    id: "invasores",
    title: "INVASORES",
    short: "Detén la marcha de los invasores antes de que lleguen al suelo.",
    long: "Una formación de 55 invasores baja paso a paso y cada vez más rápido. Dispara desde tu cañón, resguárdate tras los escudos, que se desgastan con cada impacto, y caza al platillo bonus. Tienes 3 vidas y las oleadas no se acaban.",
    cat: "SHOOTER",
    cover: "cover-invasores",
    color: "cyan",
  },
];

export const CATS: ("TODOS" | GameCategory)[] = ["TODOS", "SHOOTER", "PUZZLE", "ARCADE"];
