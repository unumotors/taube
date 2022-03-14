FROM rabbitmq:3.9-management

ENV RABBITMQ_VERSION=3.8.3

RUN rabbitmq-plugins enable --offline rabbitmq_mqtt

# RabbitMQ management plugin
EXPOSE 15672
# RabbitMQ MQTT management plugin
EXPOSE 15675
# AMQP
EXPOSE 15692
# MQTT
EXPOSE 1883
# MQTTS
EXPOSE 8883
