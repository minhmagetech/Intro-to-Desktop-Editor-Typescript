import {AudioType} from 'BBA_AudioController';
import {Audio_Events} from 'BBA_Const';
import * as hz from 'horizon/core';
/**
 * USING: for sciprt default want to call to play audio
 */
class BBA_G_AudioManager extends hz.Component<typeof BBA_G_AudioManager> {
  static propsDefinition = {
    SFX_Clicked: {type: hz.PropTypes.Entity},
  };
  
  private audioConfig: Map<AudioType, hz.Entity | undefined> = new Map();

  start() {
    this.audioConfig = new Map([
      [AudioType.SFX_Clicked, this.props.SFX_Clicked],
    ]);

    this.connectNetworkBroadcastEvent(Audio_Events.GlobalPlayAudio, (data)=> this.PlayAudio(data.audioType, data.position, data.option));
  }

  private PlayAudio(audioType: AudioType, position?: hz.Vec3, audioOption?: hz.AudioOptions) {
    let audio = this.audioConfig.get(audioType);
    if(audio == undefined || audio == null) {
      console.warn("GAudioManager: Don't have config with type = " + audioType);
      return;
    }
    if(position) {
      audio.position.set(position);
    }
    console.log('== G: Play Audio');
    audio.as(hz.AudioGizmo).play(audioOption);
  }

}
hz.Component.register(BBA_G_AudioManager);