import {Player_Events, UI_Events} from 'BBA_Const';
import {Player} from 'horizon/core';
import {Binding, Callback, Pressable, Text, UIComponent, UINode, View} from 'horizon/ui';

export class BBA_UI_Gameplay extends UIComponent<typeof BBA_UI_Gameplay>
{
  static propsDefinition = {};
  private currPlayer: Player | undefined;

  private scoreBinding: Binding<string> = new Binding("0");
  private isLeaderBinding: Binding<boolean> = new Binding(false);

  private tabBinding = {
    gameplayTabBinding: new Binding(false),
    gameOverTabBinding: new Binding(false),
    gameResultTabBinding: new Binding(false)
  };

  initializeUI(): UINode
  {
    return View({
      children: [
        UINode.if(this.tabBinding.gameplayTabBinding, GamePlayUI(this.scoreBinding)), // Gameplay Tab
        UINode.if(this.tabBinding.gameOverTabBinding, GameOverUI(this.isLeaderBinding, // Game Over Tab
          () =>
          {
            this.GoToHomePage();
          }
        )),
        UINode.if(this.tabBinding.gameResultTabBinding, GameResultUI(this.scoreBinding, this.isLeaderBinding, // Game Result Tab
          () =>
          {
            this.GoToHomePage();
          }
        )),
      ],
      style: {
        width: '100',
        height: '100',
        alignItems: 'center',
      }
    });
  }

  start()
  {
    this.currPlayer = this.entity.owner.get();
    if(this.currPlayer == this.world.getServerPlayer()) return;
  }

  public AddScore()
  {
    this.scoreBinding.set(score => (Number(score) + 1).toString());
  }

  public SetLeaderBinding(isLeader: boolean = true)
  {
    this.isLeaderBinding.set(isLeader);
  }

  public GoToHomePage()
  {
    this.sendNetworkBroadcastEvent(UI_Events.OnClickUIFinishGame, ({}));
    this.tabBinding.gameOverTabBinding.set(false);
    this.tabBinding.gameResultTabBinding.set(false);
    this.scoreBinding.set("0");
  }

  public OnStartGame()
  {
    this.tabBinding.gameplayTabBinding.set(true);
  }

  public OnGameOver()
  {
    this.tabBinding.gameplayTabBinding.set(false);
    this.tabBinding.gameOverTabBinding.set(true);
  }

  public OnSongFinish()
  {
    this.tabBinding.gameplayTabBinding.set(false);
    this.tabBinding.gameResultTabBinding.set(true);
  }

}
UIComponent.register(BBA_UI_Gameplay);

function GamePlayUI(scoreBinding: Binding<string>): UINode
{
  return View({
    children: [
      Text({
        text: 'Score',
      }),
      Text({
        text: scoreBinding,
      })
    ],
    style: {
      width: '20',
      height: '10',
      marginTop: '4',
      padding: 10,
      justifyContent: 'space-around',
      alignItems: 'center',
      flexDirection: 'row',
      backgroundColor: 'black',
    }
  });
}

function GameOverUI(isLeaderBinding: Binding<boolean>, onClick: Callback): UINode
{
  return View({
    children: [
      Text({
        text: 'Game Over',
      }),
      UINode.if(isLeaderBinding,
        Pressable({
          children:
            Text({
              text: 'New Game',
            }),
          style: {
            width: '50',
            height: '20',
            justifyContent: 'center',
            alignItems: 'center',
            borderColor: 'white',
            borderRadius: 20,
            borderWidth: 2,
            backgroundColor: 'red',
          },
          onClick: onClick
        })
      )
    ],
    style: {
      width: '30',
      height: '60',
      marginTop: '10',
      padding: 10,
      justifyContent: 'space-around',
      alignItems: 'center',
      backgroundColor: 'black',
    }
  });
}

function GameResultUI(scoreBinding: Binding<string>, isLeaderBinding: Binding<boolean>, onClick: Callback): UINode
{
  return View({
    children: [
      Text({
        text: 'Song Name',
      }),
      View({
        children: [
          Text({
            text: 'Total Score: ',
          }),
          Text({
            text: scoreBinding,
          }),
        ],
        style: {
          width: '40',
          justifyContent: 'space-between',
          flexDirection: 'row',
        }
      }),
      UINode.if(isLeaderBinding,
        Pressable({
          children:
            Text({
              text: 'Next',
            }),
          style: {
            width: '50',
            height: '20',
            justifyContent: 'center',
            alignItems: 'center',
            borderColor: 'white',
            borderRadius: 20,
            borderWidth: 2,
            backgroundColor: 'red',
          },
          onClick: onClick
        })
      )
    ],
    style: {
      width: '30',
      height: '60',
      marginTop: '10',
      padding: 10,
      justifyContent: 'space-around',
      alignItems: 'center',
      backgroundColor: 'black',
    }
  });
}