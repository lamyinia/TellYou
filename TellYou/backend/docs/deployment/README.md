# TellYou IM系统部署指南

## 部署架构

### 生产环境架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    负载均衡器 (Nginx)                        │
├─────────────────────────────────────────────────────────────┤
│                    应用服务器集群                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   App-1     │  │   App-2     │  │   App-3     │          │
│  │  :8081      │  │  :8081      │  │  :8081      │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│                    数据库集群                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   MySQL     │  │  MongoDB    │  │   Redis     │          │
│  │  Master     │  │  Replica    │  │  Cluster    │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## 环境准备

### 1. 服务器要求

#### 1.1 硬件要求

**应用服务器**：
- CPU: 4核心以上
- 内存: 8GB以上
- 硬盘: 100GB以上SSD
- 网络: 100Mbps以上

**数据库服务器**：
- CPU: 8核心以上
- 内存: 16GB以上
- 硬盘: 500GB以上SSD
- 网络: 1Gbps以上

#### 1.2 软件要求

- **操作系统**: CentOS 7.6+ / Ubuntu 18.04+
- **JDK**: OpenJDK 21
- **Docker**: 20.10+
- **Docker Compose**: 2.0+

### 2. 网络规划

```
内网网段: 192.168.1.0/24
- 应用服务器: 192.168.1.10-192.168.1.20
- 数据库服务器: 192.168.1.30-192.168.1.40
- 负载均衡器: 192.168.1.50
```

## 依赖服务部署

### 1. MySQL集群部署

#### 1.1 主从复制配置

**主库配置 (my.cnf)**:
```ini
[mysqld]
server-id = 1
log-bin = mysql-bin
binlog-format = ROW
gtid-mode = ON
enforce-gtid-consistency = ON
```

**从库配置 (my.cnf)**:
```ini
[mysqld]
server-id = 2
relay-log = mysql-relay-bin
read-only = 1
gtid-mode = ON
enforce-gtid-consistency = ON
```

#### 1.2 主从同步设置

```sql
-- 主库创建复制用户
CREATE USER 'repl'@'%' IDENTIFIED BY 'repl_password';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';
FLUSH PRIVILEGES;

-- 从库设置主库信息
CHANGE MASTER TO
  MASTER_HOST='192.168.1.30',
  MASTER_USER='repl',
  MASTER_PASSWORD='repl_password',
  MASTER_AUTO_POSITION=1;

-- 启动从库复制
START SLAVE;
```

### 2. MongoDB集群部署

#### 2.1 副本集配置

```javascript
// 配置文件 (mongod.conf)
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 0.0.0.0

replication:
  replSetName: "rs0"
```

#### 2.2 初始化副本集

```javascript
// 连接到MongoDB
mongo

// 初始化副本集
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "192.168.1.31:27017" },
    { _id: 1, host: "192.168.1.32:27017" },
    { _id: 2, host: "192.168.1.33:27017" }
  ]
})
```

### 3. Redis集群部署

#### 3.1 Redis Cluster配置

```bash
# 创建Redis集群目录
mkdir -p /opt/redis/cluster/{7000,7001,7002,7003,7004,7005}

# 配置文件 (redis.conf)
port 7000
cluster-enabled yes
cluster-config-file nodes-7000.conf
cluster-node-timeout 5000
appendonly yes
```

#### 3.2 启动集群

```bash
# 启动所有Redis实例
redis-server /opt/redis/cluster/7000/redis.conf
redis-server /opt/redis/cluster/7001/redis.conf
redis-server /opt/redis/cluster/7002/redis.conf
redis-server /opt/redis/cluster/7003/redis.conf
redis-server /opt/redis/cluster/7004/redis.conf
redis-server /opt/redis/cluster/7005/redis.conf

# 创建集群
redis-cli --cluster create 192.168.1.34:7000 192.168.1.34:7001 \
  192.168.1.34:7002 192.168.1.35:7003 192.168.1.35:7004 192.168.1.35:7005 \
  --cluster-replicas 1
```

### 4. RocketMQ集群部署

#### 4.1 NameServer配置

```bash
# 配置文件 (namesrv.properties)
listenPort=9876
rocketmqHome=/opt/rocketmq
```

#### 4.2 Broker配置

```bash
# 配置文件 (broker.conf)
brokerClusterName=DefaultCluster
brokerName=broker-a
brokerId=0
deleteWhen=04
fileReservedTime=48
brokerRole=ASYNC_MASTER
flushDiskType=ASYNC_FLUSH
listenPort=10911
namesrvAddr=192.168.1.36:9876;192.168.1.37:9876
```

## 应用部署

### 1. Docker部署

#### 1.1 Dockerfile

```dockerfile
FROM openjdk:21-jre-slim

# 设置工作目录
WORKDIR /app

# 复制jar包
COPY target/starter-0.0.1-SNAPSHOT.jar app.jar

# 设置JVM参数
ENV JAVA_OPTS="-Xms2g -Xmx4g -XX:+UseG1GC -XX:MaxGCPauseMillis=200"

# 暴露端口
EXPOSE 8081 8082

# 启动应用
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

#### 1.2 Docker Compose

```yaml
version: '3.8'

services:
  tellyou-app:
    build: .
    ports:
      - "8081:8081"
      - "8082:8082"
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - MYSQL_HOST=192.168.1.30
      - MYSQL_PORT=3306
      - MYSQL_DATABASE=tell_you_im
      - MYSQL_USERNAME=tellyou
      - MYSQL_PASSWORD=password
      - REDIS_HOST=192.168.1.34
      - REDIS_PORT=7000
      - MONGODB_HOST=192.168.1.31
      - MONGODB_PORT=27017
      - MONGODB_DATABASE=tell_you_im
      - ROCKETMQ_NAMESERVER=192.168.1.36:9876;192.168.1.37:9876
    depends_on:
      - mysql
      - redis
      - mongodb
      - rocketmq
    restart: unless-stopped
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 4G
          cpus: '2'
        reservations:
          memory: 2G
          cpus: '1'

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: tell_you_im
      MYSQL_USER: tellyou
      MYSQL_PASSWORD: password
    volumes:
      - mysql_data:/var/lib/mysql
      - ./mysql/conf.d:/etc/mysql/conf.d
    ports:
      - "3306:3306"
    restart: unless-stopped

  redis:
    image: redis:6.2-alpine
    command: redis-server --appendonly yes --cluster-enabled yes
    volumes:
      - redis_data:/data
    ports:
      - "7000-7005:7000-7005"
    restart: unless-stopped

  mongodb:
    image: mongo:4.4
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: admin_password
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"
    restart: unless-stopped

  rocketmq:
    image: apache/rocketmq:4.9.4
    environment:
      NAMESRV_ADDR: 192.168.1.36:9876;192.168.1.37:9876
    volumes:
      - rocketmq_data:/opt/rocketmq
    ports:
      - "9876:9876"
      - "10911:10911"
    restart: unless-stopped

volumes:
  mysql_data:
  redis_data:
  mongodb_data:
  rocketmq_data:
```

### 2. Kubernetes部署

#### 2.1 应用部署配置

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tellyou-app
  labels:
    app: tellyou-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tellyou-app
  template:
    metadata:
      labels:
        app: tellyou-app
    spec:
      containers:
      - name: tellyou-app
        image: tellyou-im:latest
        ports:
        - containerPort: 8081
        - containerPort: 8082
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: "prod"
        - name: MYSQL_HOST
          value: "mysql-service"
        - name: REDIS_HOST
          value: "redis-service"
        - name: MONGODB_HOST
          value: "mongodb-service"
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8081
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /actuator/health
            port: 8081
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: tellyou-service
spec:
  selector:
    app: tellyou-app
  ports:
  - name: http
    port: 8081
    targetPort: 8081
  - name: websocket
    port: 8082
    targetPort: 8082
  type: ClusterIP
```

#### 2.2 负载均衡配置

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tellyou-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  rules:
  - host: api.tellyou.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: tellyou-service
            port:
              number: 8081
  - host: ws.tellyou.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: tellyou-service
            port:
              number: 8082
```

## 负载均衡配置

### 1. Nginx配置

```nginx
upstream tellyou_backend {
    server 192.168.1.10:8081 weight=1 max_fails=3 fail_timeout=30s;
    server 192.168.1.11:8081 weight=1 max_fails=3 fail_timeout=30s;
    server 192.168.1.12:8081 weight=1 max_fails=3 fail_timeout=30s;
}

upstream tellyou_websocket {
    server 192.168.1.10:8082 weight=1 max_fails=3 fail_timeout=30s;
    server 192.168.1.11:8082 weight=1 max_fails=3 fail_timeout=30s;
    server 192.168.1.12:8082 weight=1 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.tellyou.com;
    
    location / {
        proxy_pass http://tellyou_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # 缓冲设置
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
}

server {
    listen 80;
    server_name ws.tellyou.com;
    
    location / {
        proxy_pass http://tellyou_websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## 监控配置

### 1. Prometheus配置

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'tellyou-app'
    static_configs:
      - targets: ['192.168.1.10:8081', '192.168.1.11:8081', '192.168.1.12:8081']
    metrics_path: '/actuator/prometheus'
    scrape_interval: 5s

  - job_name: 'mysql'
    static_configs:
      - targets: ['192.168.1.30:9104']

  - job_name: 'redis'
    static_configs:
      - targets: ['192.168.1.34:9121']

  - job_name: 'mongodb'
    static_configs:
      - targets: ['192.168.1.31:9216']
```

### 2. Grafana仪表板

```json
{
  "dashboard": {
    "title": "TellYou IM系统监控",
    "panels": [
      {
        "title": "应用QPS",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{instance}}"
          }
        ]
      },
      {
        "title": "响应时间",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "JVM内存使用",
        "type": "graph",
        "targets": [
          {
            "expr": "jvm_memory_used_bytes",
            "legendFormat": "{{area}}"
          }
        ]
      }
    ]
  }
}
```

## 备份策略

### 1. 数据库备份

#### 1.1 MySQL备份脚本

```bash
#!/bin/bash
# mysql_backup.sh

BACKUP_DIR="/backup/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="tell_you_im"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 全量备份
mysqldump -h 192.168.1.30 -u backup_user -p$BACKUP_PASSWORD \
  --single-transaction --routines --triggers \
  $DB_NAME > $BACKUP_DIR/full_backup_$DATE.sql

# 压缩备份文件
gzip $BACKUP_DIR/full_backup_$DATE.sql

# 删除7天前的备份
find $BACKUP_DIR -name "full_backup_*.sql.gz" -mtime +7 -delete

# 增量备份
mysqlbinlog --start-datetime="$(date -d '1 day ago' '+%Y-%m-%d %H:%M:%S')" \
  --stop-datetime="$(date '+%Y-%m-%d %H:%M:%S')" \
  /var/lib/mysql/mysql-bin.* > $BACKUP_DIR/incremental_backup_$DATE.sql

gzip $BACKUP_DIR/incremental_backup_$DATE.sql
```

#### 1.2 MongoDB备份脚本

```bash
#!/bin/bash
# mongodb_backup.sh

BACKUP_DIR="/backup/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="tell_you_im"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 全量备份
mongodump --host 192.168.1.31:27017 \
  --db $DB_NAME \
  --out $BACKUP_DIR/full_backup_$DATE

# 压缩备份
tar -czf $BACKUP_DIR/full_backup_$DATE.tar.gz -C $BACKUP_DIR full_backup_$DATE
rm -rf $BACKUP_DIR/full_backup_$DATE

# 删除7天前的备份
find $BACKUP_DIR -name "full_backup_*.tar.gz" -mtime +7 -delete
```

### 2. 应用备份

```bash
#!/bin/bash
# app_backup.sh

BACKUP_DIR="/backup/app"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份配置文件
tar -czf $BACKUP_DIR/config_backup_$DATE.tar.gz \
  /opt/tellyou/config/

# 备份日志文件
tar -czf $BACKUP_DIR/logs_backup_$DATE.tar.gz \
  /opt/tellyou/logs/

# 删除30天前的备份
find $BACKUP_DIR -name "*_backup_*.tar.gz" -mtime +30 -delete
```

## 安全配置

### 1. 防火墙配置

```bash
# 开放必要端口
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --permanent --add-port=8081/tcp
firewall-cmd --permanent --add-port=8082/tcp

# 限制数据库访问
firewall-cmd --permanent --add-rich-rule="rule family='ipv4' source address='192.168.1.0/24' port protocol='tcp' port='3306' accept"
firewall-cmd --permanent --add-rich-rule="rule family='ipv4' source address='192.168.1.0/24' port protocol='tcp' port='27017' accept"

# 重载防火墙规则
firewall-cmd --reload
```

### 2. SSL证书配置

```nginx
server {
    listen 443 ssl http2;
    server_name api.tellyou.com;
    
    ssl_certificate /etc/ssl/certs/tellyou.crt;
    ssl_certificate_key /etc/ssl/private/tellyou.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://tellyou_backend;
        # ... 其他配置
    }
}
```

## 故障处理

### 1. 常见问题

#### 1.1 应用启动失败

```bash
# 检查日志
tail -f /opt/tellyou/logs/application.log

# 检查端口占用
netstat -tlnp | grep 8081

# 检查JVM参数
jps -v
```

#### 1.2 数据库连接失败

```bash
# 检查MySQL服务状态
systemctl status mysql

# 检查连接数
mysql -u root -p -e "SHOW PROCESSLIST;"

# 检查慢查询
mysql -u root -p -e "SHOW VARIABLES LIKE 'slow_query_log';"
```

#### 1.3 消息队列问题

```bash
# 检查RocketMQ状态
sh /opt/rocketmq/bin/mqadmin clusterList -n 192.168.1.36:9876

# 检查消息堆积
sh /opt/rocketmq/bin/mqadmin consumerProgress -n 192.168.1.36:9876
```

### 2. 性能调优

#### 2.1 JVM调优

```bash
# 生产环境JVM参数
JAVA_OPTS="-Xms4g -Xmx8g \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=200 \
  -XX:+HeapDumpOnOutOfMemoryError \
  -XX:HeapDumpPath=/opt/tellyou/logs/ \
  -XX:+PrintGCDetails \
  -XX:+PrintGCTimeStamps \
  -Xloggc:/opt/tellyou/logs/gc.log"
```

#### 2.2 数据库调优

```sql
-- MySQL配置优化
SET GLOBAL innodb_buffer_pool_size = 4G;
SET GLOBAL innodb_log_file_size = 256M;
SET GLOBAL max_connections = 1000;
SET GLOBAL query_cache_size = 128M;
```

## 部署检查清单

### 1. 部署前检查

- [ ] 服务器资源充足
- [ ] 网络连通性正常
- [ ] 依赖服务已部署
- [ ] 配置文件已准备
- [ ] 数据库已初始化
- [ ] 防火墙规则已配置

### 2. 部署后检查

- [ ] 应用启动成功
- [ ] 健康检查通过
- [ ] 接口访问正常
- [ ] 数据库连接正常
- [ ] 消息队列正常
- [ ] 监控系统正常
- [ ] 日志输出正常

### 3. 性能检查

- [ ] 响应时间符合要求
- [ ] 并发处理能力达标
- [ ] 内存使用率正常
- [ ] CPU使用率正常
- [ ] 磁盘I/O正常
- [ ] 网络带宽充足

