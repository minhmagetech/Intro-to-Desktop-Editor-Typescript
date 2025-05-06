import {AnimationCallbackReasons, Asset, Component, EventSubscription, PlayAnimationOptions, Player, World} from "horizon/core";

export enum ConditionType {Bool, Number, Trigger};

export class Animator
{
  public animationList: Map<string, Animation[]>;
  private animNames: string[];
  private currentAnimation: Animation | undefined;
  private componentControl: Component;
  private variables: Map<string, AnimationConditionVariable>;
  private updateEventID: EventSubscription | undefined;
  private anyTransactions: AnimationTransactionLine[];
  private owner!: Player;

  constructor(Animations: Map<string, Animation[]>, animNames: string[], componentControl: Component, variables: Map<string, AnimationConditionVariable>)
  {
    this.animationList = Animations;
    this.animNames = animNames;
    this.currentAnimation = Animations.get(animNames[0])![0];
    this.componentControl = componentControl;
    this.variables = variables;
    this.anyTransactions = [];
  }

  /** Work around for the bug that the animation do not play the first time when players load into the world */
  public async PlayWorkAroundAnim(player: Player): Promise<boolean>
  {
    for(let i = 0; i < this.animNames.length; i++)
    {
      let animList = this.animationList.get(this.animNames[i]);
      for(let j = 0; j < animList!.length; j++)
      {
        const element = animList![j];
        if(element.isLoaded) continue;
        // console.log('play anim: ' + j + ' ' + this.animationList.get(this.animNames[i])![j].name);
        await this.TriggerAnimation(element, player, 1); // short anims should not have high play rate
      }
    }

    if(this.IsLoadFull()) return new Promise(resolve => resolve(true));
    else
    {
      return this.PlayWorkAroundAnim(player);
    }
  }

  private IsLoadFull()
  {
    for(let i = 0; i < this.animNames.length; i++)
    {
      let animList = this.animationList.get(this.animNames[i]);
      for(let j = 0; j < animList!.length; j++)
      {
        const element = animList![j];
        if(!element.isLoaded) return false;
      }
    }
    return true;
  };

  private async TriggerAnimation(animation: Animation, pl: Player, speed: number): Promise<boolean>
  {
    return new Promise((resolve) =>
    {
      pl.stopAvatarAnimation();
      pl.playAvatarAnimation(animation.animation, {
        playRate: speed,
        callback: (animS, reason) =>
        {
          if(reason === AnimationCallbackReasons.Starting)
          {
            animation.isLoaded = true;
            resolve(true);
          }
        },
      });
    });
  }

  public SetAnyTransaction(anyLine: AnimationTransactionLine)
  {
    this.anyTransactions.push(anyLine);
  }

  public SetVariable(name: string, type: ConditionType, value?: any, operator?: AnimationComparisonOperator)
  {
    // console.log("XSSS Set animator variable " + name + " " + type + " " + value);
    this.variables.set(name, {name, type, value, operator});
  }

  public async ConnectAnimator(owner: Player)
  {
    this.owner = owner;
    this.owner.stopAvatarAnimation();
    // await this.WorkAroundFlatformBug()
    if(this.currentAnimation != undefined)
    {
      this.CheckAnyLines();
      this.currentAnimation.Play(this.owner);
      console.log('play anim currently');
      this.updateEventID?.disconnect();
      this.updateEventID = this.componentControl.connectLocalBroadcastEvent(World.onUpdate, (tick) =>
      {
        this.AnimatorUpdate(tick.deltaTime);
      });
    }
  }

  public DisconnectAnimator()
  {
    if(this.currentAnimation != undefined)
    {
      this.currentAnimation.Stop(this.owner);
      this.updateEventID?.disconnect();
      this.currentAnimation = this.animationList.get(this.animNames[0])![0]; // reset to default anim
    }
  }

  private ApplyNewAnimation(newAnim: Animation)
  {
    console.log("Anim set play next anim " + newAnim.animation);
    // Stoping causes animation between steps not smooth
    // if(this.currentAnimation != undefined)
    // {
    //   this.currentAnimation.Stop(this.owner);
    // }
    this.currentAnimation = newAnim;
    this.currentAnimation.Play(this.owner);
  }

  private AnimatorUpdate(dt: number)
  {
    if(this.currentAnimation)
    {
      let nextAnim = this.currentAnimation.CheckTransaction(this.variables, dt);
      if(nextAnim)
      {
        console.log("Anim set play next anim " + nextAnim.name);
        this.ApplyNewAnimation(nextAnim);
      }
    }
  }

  private CheckAnyLines()
  {
    if(this.anyTransactions.length == 0) return;
    this.anyTransactions.forEach((value) =>
    {
      this.animationList.forEach(element =>
      {
        console.log("Anim anyline setup " + this.animationList.size);
        // element.RegisterTransition(value);
      });
    });
  }
}

export declare type AnimationComparisonOperator = '>' | '<' | '>=' | '<=' | '==' | '!=';

export class AnimationConditionGroup
{
  condisitionList: AnimationConditionVariable[];
  isAllReturnTrue: boolean;
  constructor(condisitionList: AnimationConditionVariable[], isAllTrue: boolean)
  {
    this.condisitionList = condisitionList;
    this.isAllReturnTrue = isAllTrue;
  }
}

export declare type AnimationConditionVariable = {
  name: string;
  type: ConditionType;
  value?: boolean | number;
  operator?: AnimationComparisonOperator;
};
/**
* Extends the AttachablePlayerAnchor class to provide additional attachment
* points for a player avatar.
* if waitToEnd is true, and condition is null the next animation will be played when the current animation ends
*/
export class AnimationTransactionLine
{
  nextAnimation: Animation;
  conditionGroup?: AnimationConditionGroup;
  isWaitToEnd: boolean;

  constructor(nextAnim: Animation, isWaitToEnd: boolean = false, conditions?: AnimationConditionGroup)
  {
    this.nextAnimation = nextAnim;
    this.conditionGroup = conditions;
    this.isWaitToEnd = isWaitToEnd;
  }
};

export class Animation
{
  public name: string;
  public animation: Asset;
  protected duration: number;
  protected options?: PlayAnimationOptions;
  protected currentTime: number = 0;
  protected animationTransactionLines: Array<AnimationTransactionLine> = new Array;
  public isLoaded = false;

  constructor(name: string, animation: Asset, duration: number, options?: PlayAnimationOptions)
  {
    this.name = name;
    this.animation = animation;
    this.duration = duration;
    this.options = options;
  }

  public AdjustAnimOptions(options: PlayAnimationOptions)
  {
    this.options = {...this.options, ...options};
  }

  public Play(owner: Player)
  {
    console.log(`Playing animation ${this.animation} at speed ${this.options?.playRate || 1}`);
    owner.playAvatarAnimation(this.animation, this.options);
    this.currentTime = 0;
  }

  public CheckTransaction(variables: Map<string, AnimationConditionVariable>, deltaTime: number): Animation | undefined
  {
    this.currentTime += deltaTime;
    let returnAnim = undefined;
    for(let value of this.animationTransactionLines)
    {
      if(value.isWaitToEnd)
      {
        if(this.currentTime >= this.duration / Math.abs((this.options?.playRate || 1)))
        {
          if(!value.conditionGroup || this.CheckConditions(variables, value.conditionGroup)) 
          {
            console.log(value.nextAnimation.animation);
            returnAnim = value.nextAnimation;
            break;
          }
        }
      } else
      {
        if(this.CheckConditions(variables, value.conditionGroup))
        {
          console.log(value.nextAnimation.animation);
          returnAnim = value.nextAnimation;
          break;
        }
        //TODO case looping = false
      }
    }
    // reset time for animation
    if(this.currentTime >= this.duration / (Math.abs(this.options?.playRate || 1)))
    {
      this.currentTime = 0;
    }
    return returnAnim;
  }

  public Stop(owner: Player)
  {
    owner.stopAvatarAnimation();
    console.log(`Stopping animation ${this.animation}`);
    // this.options.callback?.(this.animation.toString(), this.id);
  }


  private CheckConditions(variables: Map<string, AnimationConditionVariable>, conditionGroup?: AnimationConditionGroup): boolean
  {
    // console.log("Anim compare CheckCondisitons")
    // for(const condition of conditions) {
    //   if(this.CheckCondisiton(variables, condition)) {
    //     return true;
    //   }
    // }
    if(conditionGroup)
    {
      if(conditionGroup.isAllReturnTrue) 
      {
        for(let i = 0; i < conditionGroup.condisitionList.length; i++)
        {
          if(!this.CheckCondition(variables, conditionGroup.condisitionList[i]))
          {
            return false;
          }
        }
        return true;
      }
      else
      {
        for(let i = 0; i < conditionGroup.condisitionList.length; i++)
        {
          if(this.CheckCondition(variables, conditionGroup.condisitionList[i]))
          {
            return true;
          }
        }
      }
    }
    return false;
  }

  private CheckCondition(variables: Map<string, AnimationConditionVariable>, condition: AnimationConditionVariable): boolean
  {
    const variable = variables.get(condition.name);
    if(!variable) return false;
    switch(condition.type)
    {
      case ConditionType.Bool:
        if(variable.value) true;
        break;
      case ConditionType.Number:
        //console.log("type number: " + variable.value);
        if(this.CompareNumbers(variable.value as number, condition.value as number, condition.operator!))
        {
          variables.set(condition.name, {...variable, value: 0});
          return true;
        };
        break;
      case ConditionType.Trigger:
        //  console.log("type trigger: " + variable.value);
        if(variable.value == true)
        {
          //  console.log("trigger true");
          variables.set(condition.name, {...variable, value: false});
          return true;
        }
        break;
    }
    return false;
  }

  RegisterTransition(resignAniamtionLine: AnimationTransactionLine)
  {
    this.animationTransactionLines.push(resignAniamtionLine);
  }

  RegisterTransitionWithAnimBetween(resignAniamtionLine: AnimationTransactionLine, animBetweenAsset: Asset)
  {
    let blendedAnim = new BlendedAnimation("RUN", animBetweenAsset, 1, {looping: false, playRate: 1});
    let animStartToBlendedAnimLine = new AnimationTransactionLine(
      blendedAnim,
      resignAniamtionLine.isWaitToEnd,
      resignAniamtionLine.conditionGroup!);
    this.animationTransactionLines.push(animStartToBlendedAnimLine);

    let blendedAnimToEndAnimLine = new AnimationTransactionLine(resignAniamtionLine.nextAnimation);
    blendedAnim.animationTransactionLines.push(blendedAnimToEndAnimLine);
  }


  private CompareNumbers(value: number, target: number, operator: AnimationComparisonOperator): boolean
  {
    switch(operator)
    {
      case '>': return value > target;
      case '<': return value < target;
      case '>=': return value >= target;
      case '<=': return value <= target;
      case '==': return value === target;
      case '!=': return value !== target;
    }
  }

}

export class BlendedAnimation extends Animation
{
  public override CheckTransaction(variables: Map<string, AnimationConditionVariable>, deltaTime: number): Animation | undefined
  {
    this.currentTime += deltaTime;
    let returnAnim = undefined;
    if(this.currentTime >= (this.duration / (Math.abs(this.options?.playRate || 1))))
    {
      returnAnim = this.animationTransactionLines[0].nextAnimation;
    }
    return returnAnim;
  }
}

// Example usage:

// Khởi tạo các animation với thời lượng cụ thể
// let animA = new AnimationTransaction(assetA, { playRate: 1, looping: true }, 'animA', 5.0);
// let animB = new AnimationTransaction(assetB, { playRate: 1 }, 'animB', 3.0);

// Định nghĩa các điều kiện chuyển tiếp, trong đó một điều kiện yêu cầu kiểm tra ngay lập tức
// let conditions: ConditionVariable[] = [
//   { name: 'speed', type: 'Number', value: 1, operator: '==', isWaitToEnd: false }, // Kiểm tra cuối duration
//   { name: 'isActive', type: 'Bool', value: true, isWaitToEnd: true } // Kiểm tra liên tục trong update
// ];

// Đăng ký chuyển tiếp từ animA sang animB khi thỏa mãn điều kiện
// animA.ResignTransaction(animB, conditions);

// Cập nhật trạng thái animation (được gọi mỗi khung hình hoặc mỗi khoảng thời gian nhất định)
function update(deltaTime: number)
{
  // animA.update(deltaTime);
}
