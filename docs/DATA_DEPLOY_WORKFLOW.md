# 5e-database 数据更新 → 线上部署标准流程

> 适用场景：修改了 `5e-database` 中的 JSON 数据文件，需要把最新数据同步到本地开发环境以及远程线上 API 服务。

## 0. 前置条件

- 本地有 `5e-database`、`5e-srd-api`（或 `5e-srd-api-cn`）两个仓库，且位于同一父目录。
- 服务器已使用 `5e-srd-api/scripts/deploy.sh` 完成首次部署，或者已用 `docker-compose.server.yml` 跑起来。
- 当前线上 MongoDB 只存放 SRD 静态数据，没有需要保留的用户运行时数据。

## 1. 本地修改与验证

1. 在 `5e-database/src/` 下修改对应的 JSON 数据文件。
2. 本地验证数据格式（可选但推荐）：
   ```bash
   cd /path/to/5e-database
   npm test
   ```
3. 刷新本地 MongoDB 数据：
   ```bash
   cd /path/to/5e-srd-api
   docker compose down -v
   docker compose up -d --build
   ```
   > `-v` 会删除旧的数据卷，确保新构建的镜像里的种子数据被加载。
4. 验证 API 已生效：
   ```bash
   curl http://localhost:3000/api/2014/races | head -c 200
   ```

## 2. 提交并推送

```bash
cd /path/to/5e-database
git add .
git commit -m "feat(data): 本次数据更新说明"
git push origin main
```

确认 GitHub 远程 `main` 分支已经是最新提交：
```bash
git log --oneline -3
```

## 3. 线上部署（服务器已在运行）

### 3.1 登录服务器

```bash
ssh 用户名@服务器IP
```

### 3.2 更新服务

如果你之前用 `deploy.sh` 部署，项目默认在 `~/5e-srd/5e-srd-api-cn`：

```bash
cd ~/5e-srd/5e-srd-api-cn

# 拉取最新代码（deploy.sh 也会做这步）
cd ../5e-database && git pull && cd ../5e-srd-api-cn

# 清空旧数据卷并重新构建
docker compose down -v
docker compose up -d --build

# 查看启动日志
docker compose logs -f api
```

> **为什么不直接运行 `deploy.sh`？**
> `deploy.sh` 里的 `docker compose down` 默认不会删除匿名数据卷，可能导致新构建的镜像数据没有真正加载进来。手动加 `-v` 可以确保旧数据被清掉。

### 3.3 验证线上数据

```bash
curl http://服务器IP:3000/api/2014/races | head -c 200
```

## 4. 一键脚本（可选）

把下面命令保存为 `update-data.sh`，放在服务器 `~/5e-srd/` 下，以后每次更新数据直接执行：

```bash
#!/bin/bash
set -e

cd ~/5e-srd/5e-database
git pull

cd ~/5e-srd/5e-srd-api-cn
docker compose down -v
docker compose up -d --build

echo "数据更新完成，API 地址：http://$(curl -s ifconfig.me 2>/dev/null || echo '服务器IP'):3000"
```

## 5. 注意事项 / 风险

- `docker compose down -v` 会清空 MongoDB 里的所有数据。如果你的 MongoDB 里除了 SRD 种子数据还有其他业务数据（比如用户创建的角色），必须先备份或改用进入容器执行 `npm run db:refresh` 的方式导入。
- 如果 API 代码也需要同步更新，需要同时 push `5e-srd-api-cn`，然后一并 `docker compose up -d --build`。
- 数据更新后，前端 `character-builder` 不需要重新构建，除非 API 契约或字段有变化。

## 6. 流程图

```
本地修改 5e-database JSON
        │
        ▼
   npm test（验证）
        │
        ▼
   docker compose down -v && up -d --build（本地验证）
        │
        ▼
   git commit && git push origin main
        │
        ▼
   SSH 到服务器
        │
        ▼
   cd ~/5e-srd/5e-database && git pull
        │
        ▼
   cd ~/5e-srd/5e-srd-api-cn
   docker compose down -v && up -d --build
        │
        ▼
   curl 验证线上数据
```
