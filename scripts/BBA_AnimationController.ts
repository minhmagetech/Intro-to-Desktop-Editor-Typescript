import {UI_Events} from "BBA_Const";
import {BBA_PlayerController} from "BBA_PlayerController";
import {Asset, PlayAnimationOptions, Player, Vec3} from "horizon/core";
import {Animation, AnimationConditionGroup, AnimationConditionVariable, AnimationTransactionLine, Animator, ConditionType} from "Lib_Animator";

enum AnimID
{
  RUN = "RUN",
  SLASH_LEFT = "SLASH_LEFT",
  SLASH_RIGHT = "SLASH_RIGHT",
  SPIN_LEFT = "SPIN_LEFT",
  SPIN_RIGHT = "SPIN_RIGHT",
  DEATH = "DEATH"
}

enum AnimState {RUNNING, ATTACK_LEFT, ATTACK_RIGHT};

export const STANDARD_PLAYRATE = 0.5;

const ANIMATION_STEPS = 8; // 8 steps of the animation

const RUNNING_ANIM_DURATION = 1; // in seconds

const SLASH_ANIM_DURATION = 1; // in seconds
export const HIT_FRAME_RATIO = 0.5;

const SPIN_ANIM_DURATION = 1; // in seconds

const DEATH_ANIM_DURATION = 1; // in seconds

export class BBA_AnimationController
{
  private component: BBA_PlayerController;
  private currPlayer: Player;
  private animator: Animator;

  constructor(component: BBA_PlayerController, player: Player)
  {
    this.component = component;
    this.currPlayer = player;
    this.animator = this.SetupAnimation();
    this.animator.PlayWorkAroundAnim(player).then(()=>{
      this.component.sendNetworkBroadcastEvent(UI_Events.FinishLoadingUI, {})
    })
  }

  public AttackAnim(hitPos: Vec3, playerPos: Vec3)
  {
    // console.log("Anim set trigger true");
    if(hitPos.x - playerPos.x <= 0)
    {
      this.animator.SetVariable("attackState", ConditionType.Number, AnimState.ATTACK_LEFT);
    }
    else
    {
      this.animator.SetVariable("attackState", ConditionType.Number, AnimState.ATTACK_RIGHT);
    }
  }

  private SetupAnimation()
  {
    console.log("Setting up animation");
    let variables = this.SetupVariables();
    let {runningAnim, slashingLeftAnim, slashingRightAnim, spinLeftAnim, spinRightAnim, deathAnim} = this.SetupAnimAssets();
    this.CreateTransactionLines(runningAnim, slashingLeftAnim, slashingRightAnim, spinLeftAnim, spinRightAnim, deathAnim);

    let animations: Map<string, Animation[]> = new Map;
    animations.set(AnimID.RUN, [runningAnim]);
    animations.set(AnimID.SLASH_LEFT, slashingLeftAnim);
    animations.set(AnimID.SLASH_RIGHT, slashingRightAnim);
    animations.set(AnimID.SPIN_LEFT, [spinLeftAnim]);
    animations.set(AnimID.SPIN_RIGHT, [spinRightAnim]);
    animations.set(AnimID.DEATH, deathAnim);
    return new Animator(animations, [AnimID.RUN, AnimID.SLASH_LEFT, AnimID.SLASH_RIGHT, AnimID.SPIN_LEFT, AnimID.SPIN_RIGHT, AnimID.DEATH], this.component, variables);
  }

  private SetupVariables(): Map<string, AnimationConditionVariable>
  {
    let variables = new Map<string, AnimationConditionVariable>();
    variables.set("time", {
      name: "time",
      type: ConditionType.Number,
      value: 0,
    });
    variables.set("attackState", {
      name: "attackState",
      type: ConditionType.Number,
      value: AnimState.RUNNING,
    });
    variables.set("triggerDeath", {
      name: "triggerDeath",
      type: ConditionType.Trigger,
      value: false,
    });
    return variables;
  }

  private SetupAnimAssets(): {runningAnim: Animation; slashingLeftAnim: Animation[]; slashingRightAnim: Animation[]; spinLeftAnim: Animation; spinRightAnim: Animation; deathAnim: Animation[];}
  {
    let runningAnim = new Animation(AnimID.RUN, new Asset(BigInt("607453062125804"), BigInt("9343965828995271")), RUNNING_ANIM_DURATION, {looping: true, });

    let slashingLeftAnim = [
      new Animation(AnimID.SLASH_LEFT + "_0", new Asset(BigInt("602706402397109"), BigInt("9379777168766106")), SLASH_ANIM_DURATION),
      new Animation(AnimID.SLASH_LEFT + "_1", new Asset(BigInt("638675022015211"), BigInt("9057458014372185")), SLASH_ANIM_DURATION),
      new Animation(AnimID.SLASH_LEFT + "_2", new Asset(BigInt("932102932450994"), BigInt("9085177068218049")), SLASH_ANIM_DURATION),
      new Animation(AnimID.SLASH_LEFT + "_3", new Asset(BigInt("28551703051110901"), BigInt("28418947317750737")), SLASH_ANIM_DURATION),
      new Animation(AnimID.SLASH_LEFT + "_4", new Asset(BigInt("1486417872316936"), BigInt("9735074033192760")), SLASH_ANIM_DURATION),
      new Animation(AnimID.SLASH_LEFT + "_5", new Asset(BigInt("1135494351639278"), BigInt("9465602646835276")), SLASH_ANIM_DURATION),
      new Animation(AnimID.SLASH_LEFT + "_6", new Asset(BigInt("626457603474868"), BigInt("9200978506650900")), SLASH_ANIM_DURATION),
      new Animation(AnimID.SLASH_LEFT + "_7", new Asset(BigInt("500676973078608"), BigInt("9136830006411676")), SLASH_ANIM_DURATION),
    ];

    let slashingRightAnim = [
      new Animation(AnimID.SLASH_RIGHT + "_0", new Asset(BigInt("1775969146530349"), BigInt("9325185664263966")), SLASH_ANIM_DURATION),
      new Animation(AnimID.SLASH_RIGHT + "_1", new Asset(BigInt("626842730061825"), BigInt("9352316854888567")), SLASH_ANIM_DURATION),
      new Animation(AnimID.SLASH_RIGHT + "_2", new Asset(BigInt("537731195404127"), BigInt("8991666134277763")), SLASH_ANIM_DURATION),
      new Animation(AnimID.SLASH_RIGHT + "_3", new Asset(BigInt("434281723102784"), BigInt("8786222194814974")), SLASH_ANIM_DURATION),
      new Animation(AnimID.SLASH_RIGHT + "_4", new Asset(BigInt("1052427106618389"), BigInt("9896007117094198")), SLASH_ANIM_DURATION),
      new Animation(AnimID.SLASH_RIGHT + "_5", new Asset(BigInt("932679179053965"), BigInt("9371458389564503")), SLASH_ANIM_DURATION),
      new Animation(AnimID.SLASH_RIGHT + "_6", new Asset(BigInt("1394256971986863"), BigInt("8976944739094832")), SLASH_ANIM_DURATION),
      new Animation(AnimID.SLASH_RIGHT + "_7", new Asset(BigInt("931995849019458"), BigInt("9146315188750703")), SLASH_ANIM_DURATION),
    ];

    let spinLeftAnim = new Animation(AnimID.SPIN_LEFT, new Asset(BigInt("1316035722935190"), BigInt("9036026543112722")), SPIN_ANIM_DURATION);

    let spinRightAnim = new Animation(AnimID.SPIN_RIGHT, new Asset(BigInt("645765584677683"), BigInt("28944588685124658")), SPIN_ANIM_DURATION);

    let deathAnim = [
      new Animation(AnimID.DEATH + "_start", new Asset(BigInt("1784547625659159"), BigInt("9536326196412171")), DEATH_ANIM_DURATION),
      new Animation(AnimID.DEATH + "_end", new Asset(BigInt("1750754638807235"), BigInt("9078154542233130")), DEATH_ANIM_DURATION, {looping: true})
    ];

    return {runningAnim, slashingLeftAnim, slashingRightAnim, spinLeftAnim, spinRightAnim, deathAnim};
  }

  private CreateTransactionLines(runningAnim: Animation, slashingLeftAnim: Animation[], slashingRightAnim: Animation[], spinLeftAnim: Animation, spinRightAnim: Animation, deathAnim: Animation[])
  {
    let runCondition: AnimationConditionVariable = {
      name: "attackState",
      type: ConditionType.Number,
      value: AnimState.RUNNING,
      operator: "=="
    };
    let attackLeftCondition: AnimationConditionVariable = {
      name: "attackState",
      type: ConditionType.Number,
      value: AnimState.ATTACK_LEFT,
      operator: "=="
    };
    let attackRightCondition: AnimationConditionVariable = {
      name: "attackState",
      type: ConditionType.Number,
      value: AnimState.ATTACK_RIGHT,
      operator: "=="
    };

    let transRunConditionGroup = new AnimationConditionGroup([runCondition], true);
    let Any_Back_To_Running_Anim = new AnimationTransactionLine(runningAnim, true, transRunConditionGroup);

    // play death anim when game over
    let deathCondition: AnimationConditionVariable = {
      name: "triggerDeath",
      type: ConditionType.Trigger,
    };
    let transDeathConditionGroup = new AnimationConditionGroup([deathCondition], true);
    let Any_To_Death_Anim = new AnimationTransactionLine(deathAnim[0], false, transDeathConditionGroup);
    runningAnim.RegisterTransition(Any_To_Death_Anim);
    spinLeftAnim.RegisterTransition(Any_To_Death_Anim);
    spinRightAnim.RegisterTransition(Any_To_Death_Anim);
    deathAnim[0].RegisterTransition(new AnimationTransactionLine(deathAnim[1], true));

    for(let i = 0; i < ANIMATION_STEPS; i++)
    {
      let durationCondition: AnimationConditionVariable = {
        name: "time",
        type: ConditionType.Number,
        value: RUNNING_ANIM_DURATION / ANIMATION_STEPS * (i + 1),
        operator: '<='
      };

      let transLeftConditionGroup = new AnimationConditionGroup([durationCondition, attackLeftCondition], true);
      let Running_To_Slashing_Left_Anim = new AnimationTransactionLine(slashingLeftAnim[i], false, transLeftConditionGroup);
      runningAnim.RegisterTransition(Running_To_Slashing_Left_Anim);

      let transRightConditionGroup = new AnimationConditionGroup([durationCondition, attackRightCondition], true);
      let Running_To_Slashing_Right_Anim = new AnimationTransactionLine(slashingRightAnim[i], false, transRightConditionGroup);
      runningAnim.RegisterTransition(Running_To_Slashing_Right_Anim);

      let spinLeftConditionGroup = new AnimationConditionGroup([attackRightCondition, attackLeftCondition], false);
      let Attack_To_Spin_Left_Anim = new AnimationTransactionLine(spinLeftAnim, false, spinLeftConditionGroup);
      let Attack_Spin_To_Spin_Left_Anim = new AnimationTransactionLine(spinLeftAnim, true, spinLeftConditionGroup);
      slashingLeftAnim[i].RegisterTransition(Attack_To_Spin_Left_Anim);

      let spinRightConditionGroup = new AnimationConditionGroup([attackRightCondition, attackLeftCondition], false);
      let Attack_Slash_To_Spin_Right_Anim = new AnimationTransactionLine(spinRightAnim, false, spinRightConditionGroup);
      let Attack_Spin_To_Spin_Right_Anim = new AnimationTransactionLine(spinRightAnim, true, spinRightConditionGroup);
      slashingRightAnim[i].RegisterTransition(Attack_Slash_To_Spin_Right_Anim);


      slashingLeftAnim[i].RegisterTransition(Any_Back_To_Running_Anim);
      slashingRightAnim[i].RegisterTransition(Any_Back_To_Running_Anim);

      slashingLeftAnim[i].RegisterTransition(Any_To_Death_Anim);
      slashingRightAnim[i].RegisterTransition(Any_To_Death_Anim);

      spinLeftAnim.RegisterTransition(Attack_Spin_To_Spin_Left_Anim);
      spinRightAnim.RegisterTransition(Attack_Spin_To_Spin_Right_Anim);
    }
    // running is less priority
    spinLeftAnim.RegisterTransition(Any_Back_To_Running_Anim);
    spinRightAnim.RegisterTransition(Any_Back_To_Running_Anim);
  }

  public AdjustAnimOptions(shortestInterval: number)
  {
    this.animator.animationList.get(AnimID.SLASH_LEFT)?.forEach((anim) => anim.AdjustAnimOptions({playRate: SLASH_ANIM_DURATION / Math.max(shortestInterval, STANDARD_PLAYRATE)}));
    this.animator.animationList.get(AnimID.SLASH_RIGHT)?.forEach((anim) => anim.AdjustAnimOptions({playRate: SLASH_ANIM_DURATION / Math.max(shortestInterval, STANDARD_PLAYRATE)}));

    this.animator.animationList.get(AnimID.SPIN_LEFT)?.forEach((anim) => anim.AdjustAnimOptions({playRate: SPIN_ANIM_DURATION / Math.max(shortestInterval, STANDARD_PLAYRATE)}));
    this.animator.animationList.get(AnimID.SPIN_RIGHT)?.forEach((anim) => anim.AdjustAnimOptions({playRate: SPIN_ANIM_DURATION / Math.max(shortestInterval, STANDARD_PLAYRATE)}));
  }

  public ConnectAnimator()
  {
    console.log("Animation Controller: Start Game");
    this.animator.ConnectAnimator(this.currPlayer);
  }

  public async PlayDeathAnim()
  {
    console.log("Animation Controller: Game Over");
    this.animator.SetVariable("triggerDeath", ConditionType.Trigger, true);
  }

  public DisconnectAnimator()
  {
    console.log("Animation Controller: End Game");
    this.animator.DisconnectAnimator();
  }
}
