import * as hz from 'horizon/core';

class PoolObject
{
  Object: hz.Entity;
  Enable: boolean;
  constructor(obj: hz.Entity)
  {
    this.Object = obj;
    this.Enable = false;
  }
}

class ObjectPoolData
{
  Asset: hz.Asset;
  Pool: Array<PoolObject>;
  DefaultMaxSize: number;
  private constructor(asset: hz.Asset, defaultMaxSize: number)
  {
    this.Asset = asset;
    this.Pool = new Array<PoolObject>();
    this.DefaultMaxSize = defaultMaxSize;
  }
  static async build(asset: hz.Asset, defaultMaxSize: number): Promise<ObjectPoolData>
  {
    console.log("Build asset" + asset);
    let returnValue = new ObjectPoolData(asset, defaultMaxSize)
    for(let i = 0;i < defaultMaxSize;i++)
    {
      returnValue.SpawnNew();
    }
    return returnValue;
  }
  CheckToSpawnMore(): boolean
  {
    let enableCount = 0;
    console.log("Pool Length" + this.Pool.length)
    this.Pool.forEach((value) =>
    {
      console.log(value.Enable)
      if(value.Enable)
      {
        enableCount++;
      }
    })
    return (enableCount == this.Pool.length - 2);
  }
  async SpawnNew(): Promise<boolean>
  {
    let ins = ObjectPoolManagerSingleton.instance;
    let spawned = ins.world.spawnAsset(this.Asset, ins.entity.position.get(), ins.entity.rotation.get()).then((spanwed) =>
    {
      //console.log("Spawn fine")
      let spawnObject = spanwed[0];
      let poolObj = new PoolObject(spawnObject);
      this.Pool.push(poolObj);
    }, (e) =>
    {
      console.log("Spawn error")
    });
    await spawned;
    return true;
  }
  RemoveObjectInPool(index: number)
  {
    if(index < this.Pool.length)
    {
      this.Pool.splice(index, 1);
    }
  }
  async Acquire(): Promise<hz.Entity>
  {
    if(this.Pool.length == 0)
    {
      console.log("Get Spawn New")
      await this.SpawnNew();
      await this.SpawnNew();
      return this.Acquire();
    } else
    {
      for(let i = 0;i < this.Pool.length;i++)
      {
        if(!this.Pool[i].Enable)
        {
          // if (this.CheckToSpawnMore()) {
          //   console.log("Get Spawn More")
          //   await this.SpawnNew();
          //   await this.SpawnNew();
          //   return this.Acquire();
          // }
          this.Pool[i].Enable = true;
          return this.Pool[i].Object;
        }
      }
      console.log("Dont have free item, spawn 1 ")
      await this.SpawnNew();
      return this.Acquire();
    }

  }
  Release(obj: hz.Entity)
  {
    this.Pool.forEach((value) =>
    {
      if(value.Object === obj)
      {
        value.Enable = false;
        let pos = ObjectPoolManagerSingleton.instance.entity.position.get();
        obj.position.set(pos);
        obj.children.get().forEach((child) => child.position.set(pos));
      }
    })
  }
}

type Props = {}

export class ObjectPoolManagerSingleton extends hz.Component<Props>
{
  static propsDefinition = {};
  static instance: ObjectPoolManagerSingleton;
  poolContainer = new Map<hz.Asset, ObjectPoolData>();
  preStart()
  {
    if(ObjectPoolManagerSingleton.instance)
    {
      //cant delete so make sure only 1 obj hold this script
      return;
    }
    ObjectPoolManagerSingleton.instance = this;
  }

  start()
  {
    ObjectPoolManagerSingleton.instance = this;
  }

  async RegisterAsset(asset: hz.Asset, poolDefaultSize: number = 2)
  {
    if(this.poolContainer.get(asset) == undefined)
    {
      console.log("!UNDEFINE: " + asset.id)
      // console.log("RegisterAsset " + poolDefaultSize)
      return this.poolContainer.set(asset, await ObjectPoolData.build(asset, poolDefaultSize));
    }
  }

  async Acquire(asset: hz.Asset): Promise<hz.Entity>
  {
    let pool = this.poolContainer.get(asset);
    if(pool != undefined)
    {
      // console.log("Got pool")
      return pool.Acquire();
    }
    else
    {
      console.error("Try to acquire asset that havnt register yet. Pls run register code before call acquire")
      await this.RegisterAsset(asset, 1);
      return this.Acquire(asset);
    }
  }

  Release(asset: hz.Asset, obj: hz.Entity)
  {
    let pool = this.poolContainer.get(asset);
    if(pool != undefined)
    {
      pool.Release(obj);
    }
  }
}
hz.Component.register(ObjectPoolManagerSingleton);
