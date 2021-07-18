import { MyScene } from './myscene';
import { Preload } from './proload';
import { Component, OnInit } from '@angular/core';
import * as Phaser from 'phaser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'phaser-sample';
  game!: Phaser.Game;

  constructor() {

}

ngOnInit() {
  let option = <Phaser.Types.Core.GameConfig> {
    width: 800,
    height: 600,
    type: Phaser.AUTO,
    backgroundColor: '#71c5cf',
    physics: {
      default: 'arcade',
      arcade: {
        debug: true,
        setBounds: false
      }
    },
    parent: 'content',
    callbacks: {
      postBoot: (game) => {
        game.canvas.style.width = '100%';
        game.canvas.style.height = '100%';
      }
    }
  };

  this.game = new Phaser.Game(option);
  this.game.scene.add('main', new MyScene(), true);
  //this.game.scene.add('preload', new Preload(), true); 
}


}
