import {AudioType} from 'BBA_AudioController';
import {Audio_Events, DIFFICULTY, DIFFICULTY_ENUM, INSTRUMENT_INDEX, Player_Events, SongDataJson, SongDataJsonBinding, SWIPE_SENSITIVITY, UI_Events, UiTabBindings} from 'BBA_Const';
import {BBA_G_UI_SongSelector} from 'BBA_G_UI_SongSelector';
import {GetJsonSongDifficultyId} from 'BBA_Utilities';
import {BODY_STYLE, BORDER_STYLE, SIDE_PANEL_STYLE} from 'BBA_Style';
import {Player} from 'horizon/core';
import {Binding, Callback, Pressable, Text, UIComponent, UINode, View} from 'horizon/ui';


export class BBA_G_UI_MainManager extends UIComponent<typeof BBA_G_UI_MainManager>
{
  private chosenSongBinding: Binding<string> = new Binding("red");
  private songList: Array<SongDataJsonBinding> = [new SongDataJsonBinding()];
  private songData: SongDataJson[] = [];

  private isDragBinding: Binding<boolean> = new Binding(true);
  private isLeaderBinding: Binding<boolean> = new Binding(false);
  private currentSensitivity: Binding<string> = new Binding( "Sensitivity:" + SWIPE_SENSITIVITY.toString());


  private songSelectorUI = new BBA_G_UI_SongSelector(
    (difficultyIndex: number, songIndex: number, player: Player) =>
    {
      this.StartGame(difficultyIndex, songIndex, player);
    },
    (player: Player) =>
    {
      this.PlayClickedSound(player);
    }
  );

  private tabBinding: UiTabBindings = {
    loadingTabBinding: new Binding(true),
    homeTabBinding: new Binding(false),
    achievementsTabBinding: new Binding(false),
    shopTabBinding: new Binding(false),
    playerModeTabBinding: new Binding(false),
    settingTabBinding: new Binding(false),
    isTabOpeningBinding: new Binding(false),
  };

  initializeUI(): UINode
  {
    return View({
      children: [
        UINode.if(this.tabBinding.loadingTabBinding, LoadingTab()), // Loading Tab
        UINode.if(this.tabBinding.homeTabBinding,
          this.songSelectorUI.Render()
        ),
        UINode.if(this.tabBinding.homeTabBinding, InitUI(
          this.isDragBinding,
          this.isLeaderBinding,
          this.tabBinding,
          (player: Player) =>
          {
            this.SetGameMode(player);
          },
          (player) =>
          {
            console.log("Press Start Game");
            this.sendNetworkBroadcastEvent(Audio_Events.GlobalPlayAudio, {audioType: AudioType.SFX_Clicked, option: {fade: 0, players: [player]}});
            this.PressStartGame();
          },
          (status: boolean) => {
            this.ToggleSettingTabBinding(status)
          },

          (player: Player, quatity: number) =>
            {
              console.log("Sensitivity event send");
              this.sendNetworkBroadcastEvent(UI_Events.OnSetPlayerSensitivity,{player:player, quatity:quatity}); 
            },
            this.currentSensitivity

        )),
        this.songSelectorUI.KeyboardRender()
      ],
      style: {
        width: '100',
        height: '100',
        alignItems: 'center',
      }
    });
  }

  start() {}

  private ToggleSettingTabBinding(status: boolean){
    this.tabBinding.settingTabBinding.set(status);
    this.songSelectorUI.CanInteract = !status;
  }

  public SetUpAllSongs(songDataJson: SongDataJson[])
  {
    console.log("UI Manager: song data: " + songDataJson[0].SongName + " " + songDataJson[1].SongName);
    // songDataJson.forEach((songData, index) => {
    //   console.log(songData.SongName, index);
    //   this.songList[index].AudioFileID = songData.DifficultyLists[INSTRUMENT_INDEX].AudioFileID;
    //   this.songList[index].SongName.set(songData.SongName);
    //   this.songList[index].AudioFileBindingID.set("black");
    //   // TODO for
    //   DIFFICULTY.forEach((v, i) => {
    //     this.songList[index].DificultyBackgroundColors[i]?.set("black");
    //   })
    //   // TODO: reformat to use difficulty list
    //   this.songList[index].DificultyAssetIDLists[0] = songData.DifficultyLists[INSTRUMENT_INDEX].Easy ?? 0; // Instrument_index check via Json 
    //   this.songList[index].DificultyAssetIDLists[1] = songData.DifficultyLists[INSTRUMENT_INDEX].Medium ?? 0;
    //   this.songList[index].DificultyAssetIDLists[2] = songData.DifficultyLists[INSTRUMENT_INDEX].Hard ?? 0;
    //   this.songList[index].DificultyAssetIDLists[3] = songData.DifficultyLists[INSTRUMENT_INDEX].Expert ?? 0;

    //   // this.songList[index].MediumBinding?.set("black");
    //   // this.songList[index].HardBinding?.set("black");
    //   // this.songList[index].ExpertBinding?.set("black");
    // })

    // Use file Anyway you want it to play the song only
    this.songData = songDataJson;
    this.songList[0].AudioFileID = songDataJson[0].DifficultyLists[INSTRUMENT_INDEX].AudioFileID;
    this.songList[0].SongName.set(songDataJson[0].SongName);
    this.songList[0].AudioFileBindingID.set("black");
    // TODO for
    DIFFICULTY.forEach((v, i) =>
    {
      this.songList[0].DificultyBackgroundColors[i]?.set("black");
    });
    // TODO: reformat to use difficulty list
    this.songList[0].DificultyAssetIDLists[0] = songDataJson[0].DifficultyLists[INSTRUMENT_INDEX].Easy ?? 0; // Instrument_0 check via Json 
    this.songList[0].DificultyAssetIDLists[1] = songDataJson[0].DifficultyLists[INSTRUMENT_INDEX].Medium ?? 0;
    this.songList[0].DificultyAssetIDLists[2] = songDataJson[0].DifficultyLists[INSTRUMENT_INDEX].Hard ?? 0;
    this.songList[0].DificultyAssetIDLists[3] = songDataJson[0].DifficultyLists[INSTRUMENT_INDEX].Expert ?? 0;

    this.SetDifficulty(DIFFICULTY_ENUM.EASY, 0, this.songList[0].DificultyBackgroundColors[DIFFICULTY_ENUM.EASY]); // Set default to easy mode first song

    //-------
    // Remove it if want show all song, currently only show song 1
    this.songData = [this.songData[0]]
    //-------

    this.songSelectorUI.SetData(this.songData);
  }

  private SetGameMode(player: Player)
  {
    this.isDragBinding.set((prev) =>
    {
      this.sendNetworkBroadcastEvent(Player_Events.OnSetPlayerInput, ({player, isDrag: !prev}));
      return !prev;
    }, [player]);
  }

  private PickSong(difficultyIndex: number, songIndex: number, chosenMode: string, chosenSong: number, chosenSongPlayer: number)
  {
    this.chosenSongBinding.set('black');
    this.songList[songIndex].DificultyBackgroundColors[difficultyIndex].set('red');
    this.chosenSongBinding = this.songList[songIndex].DificultyBackgroundColors[difficultyIndex];

    this.sendNetworkBroadcastEvent(UI_Events.OnClickUISongChange, ({songMode: chosenMode, songDataAsset: chosenSong, songPlayer: chosenSongPlayer}));
  }

  public SetLeaderBinding(player: Player, isLeader: boolean = true)
  {
    this.isLeaderBinding.set(isLeader, [player]);
  }

  private PressStartGame()
  {
    this.TurnOnLoading();
    this.sendNetworkBroadcastEvent(UI_Events.OnClickUIStartGame, ({}));
  }

  private TurnOnLoading()
  {
    this.tabBinding.loadingTabBinding.set(true);
    this.tabBinding.homeTabBinding.set(false);
  }

  public CompleteSetup(){
    this.tabBinding.homeTabBinding.set(true);
    this.tabBinding.loadingTabBinding.set(false);
  }
  public GoToHomePage()
  {
    this.entity.visible.set(true);
    this.tabBinding.homeTabBinding.set(true);
    this.FinishLoad();
  }

  public FinishLoad()
  {
    this.tabBinding.loadingTabBinding.set(false);
  }

  private SetDifficulty(difficultyIndex: number, songIndex: number, isChosenBinding: Binding<string>)
  {
    console.log("Song: " + this.songList[songIndex].SongName + ", Difficulty: " + DIFFICULTY[difficultyIndex]);
    this.chosenSongBinding?.set('black');
    isChosenBinding?.set('red');
    this.chosenSongBinding = isChosenBinding;

    this.PickSong(difficultyIndex, songIndex, DIFFICULTY[difficultyIndex], this.songList[songIndex].DificultyAssetIDLists[difficultyIndex], this.songList[songIndex].AudioFileID);
  }

  public StartGame(difficultyIndex: number, songIndex: number, player: Player)
  {
    this.sendNetworkBroadcastEvent(UI_Events.OnClickUISongChange, ({songMode: DIFFICULTY[difficultyIndex], songDataAsset: GetJsonSongDifficultyId(songIndex, INSTRUMENT_INDEX, difficultyIndex, this.songData), songPlayer: this.songData[songIndex].DifficultyLists[INSTRUMENT_INDEX].AudioFileID}));
    this.sendNetworkBroadcastEvent(Audio_Events.GlobalPlayAudio, {audioType: AudioType.SFX_Clicked, option: {fade: 0, players: [player]}})
    this.PressStartGame();
  }

  public PlayClickedSound(player: Player)
  {
    this.sendNetworkBroadcastEvent(Audio_Events.GlobalPlayAudio, {audioType: AudioType.SFX_Clicked, option: {fade: 0, players: [player]}})
  }

  public SetSensitivityBinding(value: number)
  {
    this.currentSensitivity.set("Sensitivity:" +value.toString());
  }

}
UIComponent.register(BBA_G_UI_MainManager);

function LoadingTab(): UINode
{
  return View({
    children: Text({
      text: 'Loading...'
    }),
    style: {
      width: '80',
      height: '70',
      marginTop: '10',
      padding: 100,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'black',
    }
  });
}

function InitUI(isDragBinding: Binding<boolean>, isLeaderBinding: Binding<boolean>, uiTabBindings: UiTabBindings, onToggleClick: Callback, onStartClick: Callback, onToggleSettingTabBinding: (status: boolean) => void,
  onSensitivityClick: (p: Player, quatity: number) => void, currentSensitivityBinding: Binding<string>): UINode
{
  return View({
    children: [
      LeftSidePanel(uiTabBindings),
      RightSidePanel(uiTabBindings, onToggleSettingTabBinding),
      UINode.if(uiTabBindings.playerModeTabBinding, ConfirmationPromptUI(uiTabBindings)),
      UINode.if(uiTabBindings.settingTabBinding, SettingPopupUI(isDragBinding, isLeaderBinding, uiTabBindings, onToggleClick, onStartClick, onToggleSettingTabBinding,onSensitivityClick,currentSensitivityBinding)),
    ],
    style: BODY_STYLE
  });
}

function PickDifficultyContainer(songList: Array<SongDataJsonBinding>, onClick: any): UINode
{
  return View({
    children: songList.map((song: SongDataJsonBinding, songIndex) =>
      View({
        children: [
          Text({
            text: song?.SongName ?? "",
          }),
          // TODO CLear error message UI
          DIFFICULTY.map((_, index) => DifficultyButton(index, songIndex, song.DificultyBackgroundColors[index], onClick)),
        ],
        style: {
          width: 600,
          justifyContent: 'space-evenly',
          alignItems: 'center',
          flexDirection: 'row',
        }
      })
    ),
    style: {
      height: '40',
      width: '60',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexDirection: 'column',
    }
  });
}

function MovementModeContainer(isDragBinding: Binding<boolean>, onToggleClick: Callback): UINode
{
  return UINode.if(isDragBinding,
    MovementModeToggleButton('Current Mode: Drag Mode', 'Turn on Click On Screen Mode', onToggleClick),
    MovementModeToggleButton('Current Mode: Click On Screen Mode', 'Turn on Drag Mode', onToggleClick),
  );
}

function MovementModeToggleButton(textBinding: string, buttonTextBinding: string, onToggleClick: Callback): UINode
{
  return View({
    children: [
      Text({
        text: textBinding,
        style: {
          width: '50',
        }
      }),
      Pressable({
        children: Text({
          text: buttonTextBinding,
        }),
        style: {
          width: '50',
          height: '80',
          justifyContent: 'center',
          alignItems: 'center',
          borderColor: 'white',
          borderRadius: 20,
          borderWidth: 2,
          backgroundColor: 'red',
        },
        onClick: onToggleClick,
      }),
    ],
    style: {
      height: '25',
      width: '80',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
    }
  });
}

function StartGameButton(onStartClick: Callback): UINode
{
  return Pressable({
    // children:
    //   Text({
    //     text: 'Start Game',
    //   }),
    style: {
      width: '20',
      height: '20',
      justifyContent: 'center',
      alignItems: 'center',
      // borderColor: 'white',
      borderRadius: 20,
      borderWidth: 2,
      // backgroundColor: 'red',
    },
    // onClick: onStartClick,
  });
}

function DifficultyButton(difficultyIndex: number, songIndex: number, isChosenBinding: Binding<string>, onClick: any): UINode
{
  return Pressable({
    children: Text({text: DIFFICULTY[difficultyIndex]}),
    style: {
      padding: 15,
      justifyContent: 'center',
      alignItems: 'center',
      borderColor: 'white',
      borderWidth: 2,
      backgroundColor: isChosenBinding,
    },
    onClick: (player) =>
    {
      onClick(player, difficultyIndex, songIndex, isChosenBinding);
    }
  });
}

//#region new UI
function LeftSidePanel(uiTabBindings: UiTabBindings): UINode
{
  return View({
    children: [
      CurrencyUI(),
      AchievementsButton(uiTabBindings.achievementsTabBinding),
      ShopButton(uiTabBindings.shopTabBinding),
      MissionListSection(),
      PlayerModeButton(uiTabBindings),
    ],
    style: {
      ...SIDE_PANEL_STYLE,
      alignItems: 'flex-start',
    }
  });
}

function RightSidePanel(uiTabBindings: UiTabBindings, onToggleSettingTabBinding: (status: boolean) => void): UINode
{
  return View({
    children: [
      SettingsButton(uiTabBindings, onToggleSettingTabBinding),
    ],
    style: {
      ...SIDE_PANEL_STYLE,
      alignItems: 'flex-end',
    }
  });
}

function CurrencyUI(): UINode
{
  return View({
    children: [{currency: '0'}, {currency: '0'}].map((value, index) =>
      View({
        children: [
          Text({
            text: 'CURRENCY: ',
            style: {
              color: 'black',
              fontSize: 15
            }
          }),
          Text({
            text: value.currency,
            style: {
              color: 'black',
              fontSize: 15
            }
          })
        ],
        style: {
          ...BORDER_STYLE,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          width: '85',
          height: '45',
        }
      })
    ),
    style: {
      width: '30',
      height: '15',
      justifyContent: 'space-between',
    }
  });
}

function AchievementsButton(achievementsTabBinding: Binding<boolean>): UINode
{
  return Pressable({
    children:
      Text({
        text: 'ACHIEVEMENTS',
        style: {
          color: 'black',
          paddingLeft: 20,
        }
      }),
    style: {
      ...BORDER_STYLE,
      justifyContent: 'center',
      width: '40',
      height: '12',
    },
    onClick: () =>
    {
      achievementsTabBinding.set(true);
    }
  });
}

function ShopButton(shopTabBinding: Binding<boolean>): UINode
{
  return Pressable({
    children:
      Text({
        text: 'SHOP',
        style: {
          color: 'black',
          paddingLeft: 20,
        }
      }),
    style: {
      ...BORDER_STYLE,
      justifyContent: 'center',
      width: '40',
      height: '12',
    },
    onClick: () =>
    {
      shopTabBinding.set(true);
    }
  });
}

function MissionListSection(): UINode
{
  return View({
    children: [
      Text({
        text: 'MISSION LIST',
        style: {
          color: 'black',
          paddingLeft: 20,
        }
      }),
      [{missionName: "Mission 1"}, {missionName: "Mission 2"}, {missionName: "Mission 3"}].map((mission, index) =>
        Text({
          text: mission.missionName,
          style: {
            color: 'black',
            paddingLeft: 20,
          }
        }),
      ),
      Text({
        text: 'Time Left hh:mm:ss',
        style: {
          color: 'black',
          textAlign: 'right',
          paddingRight: 20,
        }
      }),
    ],
    style: {
      ...BORDER_STYLE,
      justifyContent: 'center',
      width: '73',
      height: '30',
    }
  });
}

function PlayerModeButton(uiTabBindings: UiTabBindings): UINode
{
  return Pressable({
    children:
      Text({
        text: 'MULTIPLAYER',
        style: {
          color: 'black',
          paddingLeft: 20,
        }
      }),
    style: {
      ...BORDER_STYLE,
      justifyContent: 'center',
      width: '73',
      height: '15',
    },
    onClick: () =>
    {
      uiTabBindings.isTabOpeningBinding.set((prev) =>
      {
        if(!prev)
        {
          uiTabBindings.playerModeTabBinding.set(true);
        }
        return true;
      });
    }
  });
}

function SettingsButton(uiTabBindings: UiTabBindings, onToggleSettingTabBinding: (status: boolean) => void): UINode
{
  return Pressable({
    children: [
      Text({
        text: 'Settings',
        style: {
          color: 'black',
        }
      }),
    ],
    style: {
      ...BORDER_STYLE,
      justifyContent: 'center',
      alignItems: 'center',
      width: '17',
      height: '8',
    },
    onClick: () =>
    {
      uiTabBindings.isTabOpeningBinding.set((prev) =>
      {
        if(!prev)
        {
          // uiTabBindings.settingTabBinding.set(true);
          onToggleSettingTabBinding(true);
        }
        return true;
      });
    }
  });
}

function SongSelectorUI(): UINode
{
  return View({
    children: [
      Text({
        text: 'Song Selector',
        style: {
          color: 'black',
        }
      }),
    ],
    style: {
      ...BORDER_STYLE,
      justifyContent: 'center',
      alignItems: 'center',
      width: '73',
      height: '90',
    }
  });
}

function ConfirmationPromptUI(uiTabBindings: UiTabBindings): UINode
{
  return View({
    children: View({
      children: [
        Text({
          text: 'You are in single player mode.',
          style: {
            color: 'black',
            fontWeight: 'bold',
          }
        }),
        Text({
          text: 'You will be teleport to multiplayer world. Do you want to continue?',
          style: {
            color: 'black',
          }
        }),
        View({
          children: [
            Pressable({
              children:
                Text({
                  text: 'Cancel',
                  style: {
                    color: 'black',
                  },
                }),
              style: {
                ...BORDER_STYLE,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 10
              },
              onClick: () =>
              {
                uiTabBindings.playerModeTabBinding.set(false);
                uiTabBindings.isTabOpeningBinding.set(false);
              }
            }),
            Pressable({
              children:
                Text({
                  text: 'Continue',
                  style: {
                    color: 'black',
                  }
                }),
              style: {
                ...BORDER_STYLE,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 10
              }
            }),
          ],
          style: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '50'
          }
        })
      ],
      style: {
        ...BORDER_STYLE,
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        width: '50',
        height: '50',
      }
    }),
    style: {
      ...BODY_STYLE,
      position: 'absolute',
      justifyContent: 'center',
    }
  });
}

function SettingPopupUI(isDragBinding: Binding<boolean>, isLeaderBinding: Binding<boolean>, uiTabBindings: UiTabBindings, onToggleClick: any, onStartClick: Callback, onToggleSettingTabBinding: (status: boolean) => void,
  onSensitivityClick: (p: Player, quatity: number) => void, currentSensitivityBinding: Binding<string>): UINode
{
  return View({
    children: View({
      children: [
        CloseButton(onToggleSettingTabBinding, uiTabBindings.isTabOpeningBinding),
        MovementModeContainer(isDragBinding, onToggleClick),
        UINode.if(isLeaderBinding, StartGameButton(onStartClick)),
        SensivitySettingView(currentSensitivityBinding,onSensitivityClick),
      ],
      style: {
        ...BORDER_STYLE,
        backgroundColor: 'black',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 30,
        width: '80',
        height: '100'
      }
    }),
    style: {
      ...BODY_STYLE,
      position: 'absolute',
      justifyContent: 'center',
    }
  });
}

function CloseButton(onToggleSettingTabBinding: (status: boolean) => void, isTabOpeningBinding: Binding<boolean>): UINode<any>
{
  return Pressable({
    children: Text({
      text: "X",
      style: {
        color: 'white'
      }
    }),
    style: {
      left: '50',
      backgroundColor: 'red',
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      width: 30,
      height: 30,
    },
    onClick: () =>
    {
      // tabBinding.set(false);
      onToggleSettingTabBinding(false);
      isTabOpeningBinding.set(false);
    }
  });
}

function SensivityButton(value: number, onSensitivityClick: (p: Player, quatity: number) =>void): UINode<any>
{
  let text = value > 0 ? "+" : "-";
  return Pressable({
    children: Text({
      text: text,
      style: {
        color: 'black'
      }
    }),

    onClick: (player) =>
    {
      onSensitivityClick(player,value);
    },

    style: {
      ...BORDER_STYLE,
      justifyContent: 'center',
      alignItems: 'center',
      width: 50,
      height: 30,
    }
  })
}

function SensivitySettingView(currentSensitivityBinding: Binding<string>,onSensitivityClick: (p: Player, quatity: number) =>void): UINode<any>
{
  return View({
    children: [
      SensivityButton(-1,onSensitivityClick),
      Text({
        text: currentSensitivityBinding,
        style: {
          color: 'White',
        }
      }),
      SensivityButton(+1,onSensitivityClick),
    ],
    style: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      alignItems: 'center',
      width: '60',
      height: '20',
    }
  })
}

//#endregion
