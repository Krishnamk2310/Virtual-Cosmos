import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

// Assets
import spriteFront from '../assets/front.png';
import spriteBack from '../assets/back.png';
import spriteSide from '../assets/side.png';

const WORLD_W = 1600;
const WORLD_H = 900;
const AVATAR_SIZE = 54;
const PROX_R = 150;
const SPEED = 7;
const EMIT_INTERVAL = 50;
const TILE = 80;
const CAM_LERP = 0.1;


export default function CosmosCanvas({ selfUser, otherUsers, nearbyUserIds, onMove }) {
  const mountRef = useRef(null);
  const stateRef = useRef({
    otherUsers,
    nearbyUserIds,
    onMove,
    containers: new Map(),
    keys: {},
    position: { x: selfUser?.position?.x ?? 400, y: selfUser?.position?.y ?? 300 },
    direction: selfUser?.direction ?? 'down',
    lastEmit: 0,
  });

  stateRef.current.otherUsers = otherUsers;
  stateRef.current.nearbyUserIds = nearbyUserIds;
  stateRef.current.onMove = onMove;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    mount.innerHTML = '';

    const app = new PIXI.Application({
      width: mount.clientWidth || window.innerWidth,
      height: mount.clientHeight || window.innerHeight,
      backgroundColor: 0x0b0d14,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      roundPixels: true,
    });

    mount.appendChild(app.view);

    const processTexture = async (url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 220 && data[i+1] > 220 && data[i+2] > 220) {
              data[i + 3] = 0;
            }
          }
          ctx.putImageData(imageData, 0, 0);
          
          const base = new PIXI.BaseTexture(canvas);
          base.scaleMode = PIXI.SCALE_MODES.NEAREST;
          
          const w = canvas.width;
          const h = canvas.height;
          resolve(new PIXI.Texture(base, new PIXI.Rectangle(10, 10, w - 20, h - 20)));
        };
      });
    };

    const loadAll = async () => {
      const tex = {
        front: await processTexture(spriteFront),
        back: await processTexture(spriteBack),
        side: await processTexture(spriteSide),
      };

      Object.assign(textures, tex);

      // Update self
      const selfKey = stateRef.current.direction === 'left' || stateRef.current.direction === 'right' ? 'side' : stateRef.current.direction;
      if (textures[selfKey]) {
        selfContainer._sprite.texture = textures[selfKey];
      }

      // Update all others that were already built with EMPTY textures
      stateRef.current.containers.forEach((c) => {
        const dir = c._direction || 'front';
        const key = (dir === 'left' || dir === 'right') ? 'side' : dir;
        if (textures[key]) {
          c._sprite.texture = textures[key];
        }
      });
    };

    const textures = { front: null, back: null, side: null };
    loadAll();


    function buildUser(username, color, direction, isSelf) {
      const container = new PIXI.Container();
      const colorInt = parseInt(color.replace('#', ''), 16);

      const ring = new PIXI.Graphics();
      ring.beginFill(colorInt, 0.07);
      ring.lineStyle(1.5, colorInt, 0.22);
      ring.drawCircle(0, 0, PROX_R);
      ring.endFill();
      ring.visible = isSelf;
      container.addChild(ring);
      container._ring = ring;

      const shadow = new PIXI.Graphics();
      shadow.beginFill(0x000000, 0.25);
      shadow.drawEllipse(0, 24, 16, 6);
      shadow.endFill();
      container.addChild(shadow);

      const spriteWrapper = new PIXI.Container();
      container.addChild(spriteWrapper);
      container._spriteWrapper = spriteWrapper;

      const dirKey = (direction === 'left' || direction === 'right') ? 'side' : direction;
      const sprite = new PIXI.Sprite(textures[dirKey] || PIXI.Texture.EMPTY);
      sprite.anchor.set(0.5, 0.5);
      sprite.width = AVATAR_SIZE;
      sprite.height = AVATAR_SIZE;

      if (direction === 'left') {
        spriteWrapper.scale.x = -1;
      } else {
        spriteWrapper.scale.x = 1;
      }
      spriteWrapper.addChild(sprite);
      container._sprite = sprite;

      const label = new PIXI.Text(username, {
        fontFamily: 'Inter, sans-serif',
        fontSize: 11,
        fontWeight: '600',
        fill: 0xffffff,
        dropShadow: true,
        dropShadowColor: 0x000000,
        dropShadowBlur: 6,
        dropShadowDistance: 0,
      });
      label.anchor.set(0.5, 0);
      label.y = 28;
      container.addChild(label);

      container._isSelf = isSelf;
      return container;
    }

    const buildWorld = () => {
      const world = new PIXI.Container();
      const bg = new PIXI.Graphics();
      for (let x = 0; x < WORLD_W; x += TILE) {
        for (let y = 0; y < WORLD_H; y += TILE) {
          const alt = (Math.floor(x / TILE) + Math.floor(y / TILE)) % 2 === 0;
          bg.beginFill(alt ? 0x131826 : 0x161d2e);
          bg.drawRect(x, y, TILE, TILE);
          bg.endFill();
        }
      }
      bg.lineStyle(1, 0xffffff, 0.035);
      for (let x = 0; x <= WORLD_W; x += TILE) {
        bg.moveTo(x, 0).lineTo(x, WORLD_H);
      }
      for (let y = 0; y <= WORLD_H; y += TILE) {
        bg.moveTo(0, y).lineTo(WORLD_W, y);
      }
      world.addChild(bg);

      const zones = [
        { x: 80, y: 80, w: 360, h: 240, label: 'Lobby', color: 0x1e3a5f },
        { x: 500, y: 80, w: 300, h: 200, label: 'Room A', color: 0x2d1b4e },
        { x: 880, y: 80, w: 300, h: 200, label: 'Room B', color: 0x1e4a3a },
        { x: 80, y: 560, w: 500, h: 260, label: 'Lounge', color: 0x3a2a0e },
        { x: 1100, y: 400, w: 420, h: 420, label: 'Meeting Hall', color: 0x1a2a4a },
      ];

      zones.forEach(({ x, y, w, h, label, color }) => {
        const zone = new PIXI.Graphics();
        zone.beginFill(color, 0.55);
        zone.lineStyle(1.5, color + 0x404040, 0.4);
        zone.drawRoundedRect(x, y, w, h, 8);
        zone.endFill();
        world.addChild(zone);
        const text = new PIXI.Text(label, {
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
          fontWeight: '600',
          fill: 0xffffff,
          alpha: 0.35,
        });
        text.x = x + 10;
        text.y = y + 10;
        world.addChild(text);
      });


      return world;
    };

    const world = buildWorld();
    app.stage.addChild(world);

    const selfContainer = buildUser(
      selfUser.username,
      selfUser.color,
      stateRef.current.direction,
      true
    );
    selfContainer.x = stateRef.current.position.x;
    selfContainer.y = stateRef.current.position.y;
    world.addChild(selfContainer);

    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      stateRef.current.keys[e.key] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e) => {
      stateRef.current.keys[e.key] = false;
    };

    const handleFocusIn = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        stateRef.current.keys = {};
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('focusin', handleFocusIn);

    app.ticker.add(() => {
      const state = stateRef.current;
      const k = state.keys;
      let { x, y } = state.position;
      let moved = false;
      let newDir = state.direction;

      if (k['ArrowUp'] || k['w'] || k['W'] || k['Up']) { y -= SPEED; moved = true; newDir = 'back'; }
      if (k['ArrowDown'] || k['s'] || k['S'] || k['Down']) { y += SPEED; moved = true; newDir = 'front'; }
      if (k['ArrowLeft'] || k['a'] || k['A'] || k['Left']) { x -= SPEED; moved = true; newDir = 'left'; }
      if (k['ArrowRight'] || k['d'] || k['D'] || k['Right']) { x += SPEED; moved = true; newDir = 'right'; }

      x = Math.max(24, Math.min(WORLD_W - 24, x));
      y = Math.max(24, Math.min(WORLD_H - 24, y));

      if (moved || newDir !== state.direction) {
        state.position = { x, y };
        state.direction = newDir;
        selfContainer.x = x;
        selfContainer.y = y;

        const texKey = (newDir === 'left' || newDir === 'right') ? 'side' : newDir;
        selfContainer._sprite.texture = textures[texKey];
        selfContainer._spriteWrapper.scale.x = (newDir === 'left') ? -1 : 1;

        const now = Date.now();
        if (now - state.lastEmit > EMIT_INTERVAL) {
          state.onMove(x, y, newDir);
          state.lastEmit = now;
        }
      }

      const { otherUsers: users, nearbyUserIds: nearby, containers } = state;
      const userMap = new Map(users.map((u) => [u.socketId, u]));

      containers.forEach((c, sid) => {
        if (!userMap.has(sid)) {
          world.removeChild(c);
          c.destroy({ children: true });
          containers.delete(sid);
        }
      });

      userMap.forEach((user, sid) => {
        if (!containers.has(sid)) {
          const c = buildUser(user.username, user.color, user.direction || 'front', false);
          c.x = user.position.x;
          c.y = user.position.y;
          world.addChildAt(c, world.children.length - 1);
          containers.set(sid, c);
        } else {
          const c = containers.get(sid);
          c.x += (user.position.x - c.x) * 0.3;
          c.y += (user.position.y - c.y) * 0.3;
          const dir = user.direction || 'front';
          const texKey = (dir === 'left' || dir === 'right') ? 'side' : dir;
          c._sprite.texture = textures[texKey];
          c._spriteWrapper.scale.x = (dir === 'left') ? -1 : 1;
        }
        containers.get(sid)._ring.visible = nearby.has(sid);
      });

      const vw = app.screen.width;
      const vh = app.screen.height;
      const tx = vw / 2 - selfContainer.x;
      const ty = vh / 2 - selfContainer.y;

      world.x += (tx - world.x) * CAM_LERP;
      world.y += (ty - world.y) * CAM_LERP;

      const minX = Math.min(0, vw - WORLD_W);
      const minY = Math.min(0, vh - WORLD_H);
      world.x = Math.max(minX, Math.min(0, world.x));
      world.y = Math.max(minY, Math.min(0, world.y));
    });

    const handleResize = () => {
      if (mount.clientWidth && mount.clientHeight) {
        app.renderer.resize(mount.clientWidth, mount.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('resize', handleResize);
      app.destroy(true, { children: true });
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
}
