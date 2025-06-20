<?php

/*
 | --------------------------------------------------------------------
 | App Namespace
 | --------------------------------------------------------------------
 |
 | This defines the default Namespace that is used throughout
 | CodeIgniter to refer to the Application directory. Change
 | this constant to change the namespace that all application
 | classes should use.
 |
 | NOTE: changing this will require manually modifying the
 | existing namespaces of App\* namespaced-classes.
 */
defined('APP_NAMESPACE') || define('APP_NAMESPACE', 'App');

/*
 | --------------------------------------------------------------------------
 | Composer Path
 | --------------------------------------------------------------------------
 |
 | The path that Composer's autoload file is expected to live. By default,
 | the vendor folder is in the Root directory, but you can customize that here.
 */
defined('COMPOSER_PATH') || define('COMPOSER_PATH', ROOTPATH . 'vendor/autoload.php');

/*
 |--------------------------------------------------------------------------
 | Timing Constants
 |--------------------------------------------------------------------------
 |
 | Provide simple ways to work with the myriad of PHP functions that
 | require information to be in seconds.
 */
defined('SECOND') || define('SECOND', 1);
defined('MINUTE') || define('MINUTE', 60);
defined('HOUR')   || define('HOUR', 3600);
defined('DAY')    || define('DAY', 86400);
defined('WEEK')   || define('WEEK', 604800);
defined('MONTH')  || define('MONTH', 2_592_000);
defined('YEAR')   || define('YEAR', 31_536_000);
defined('DECADE') || define('DECADE', 315_360_000);

/*
 | --------------------------------------------------------------------------
 | Exit Status Codes
 | --------------------------------------------------------------------------
 |
 | Used to indicate the conditions under which the script is exit()ing.
 | While there is no universal standard for error codes, there are some
 | broad conventions.  Three such conventions are mentioned below, for
 | those who wish to make use of them.  The CodeIgniter defaults were
 | chosen for the least overlap with these conventions, while still
 | leaving room for others to be defined in future versions and user
 | applications.
 |
 | The three main conventions used for determining exit status codes
 | are as follows:
 |
 |    Standard C/C++ Library (stdlibc):
 |       http://www.gnu.org/software/libc/manual/html_node/Exit-Status.html
 |       (This link also contains other GNU-specific conventions)
 |    BSD sysexits.h:
 |       http://www.gsp.com/cgi-bin/man.cgi?section=3&topic=sysexits
 |    Bash scripting:
 |       http://tldp.org/LDP/abs/html/exitcodes.html
 |
 */
defined('EXIT_SUCCESS')        || define('EXIT_SUCCESS', 0);        // no errors
defined('EXIT_ERROR')          || define('EXIT_ERROR', 1);          // generic error
defined('EXIT_CONFIG')         || define('EXIT_CONFIG', 3);         // configuration error
defined('EXIT_UNKNOWN_FILE')   || define('EXIT_UNKNOWN_FILE', 4);   // file not found
defined('EXIT_UNKNOWN_CLASS')  || define('EXIT_UNKNOWN_CLASS', 5);  // unknown class
defined('EXIT_UNKNOWN_METHOD') || define('EXIT_UNKNOWN_METHOD', 6); // unknown class member
defined('EXIT_USER_INPUT')     || define('EXIT_USER_INPUT', 7);     // invalid user input
defined('EXIT_DATABASE')       || define('EXIT_DATABASE', 8);       // database error
defined('EXIT__AUTO_MIN')      || define('EXIT__AUTO_MIN', 9);      // lowest automatically-assigned error code
defined('EXIT__AUTO_MAX')      || define('EXIT__AUTO_MAX', 125);    // highest automatically-assigned error code

/**
 * @deprecated Use \CodeIgniter\Events\Events::PRIORITY_LOW instead.
 */
define('EVENT_PRIORITY_LOW', 200);

/**
 * @deprecated Use \CodeIgniter\Events\Events::PRIORITY_NORMAL instead.
 */
define('EVENT_PRIORITY_NORMAL', 100);

/**
 * @deprecated Use \CodeIgniter\Events\Events::PRIORITY_HIGH instead.
 */
define('EVENT_PRIORITY_HIGH', 10);

/**
 * Hikrobot Webservices
 */
defined('HIKROBOT_GEN_AGV_SCHEDULING_TASK')                     || define('HIKROBOT_GEN_AGV_SCHEDULING_TASK', 'genAgvSchedulingTask');
defined('HIKROBOT_CONTINUE_TASK')                               || define('HIKROBOT_CONTINUE_TASK', 'continueTask');
defined('HIKROBOT_CANCEL_TASK')                                 || define('HIKROBOT_CANCEL_TASK', 'cancelTask');
defined('HIKROBOT_SET_TASK_PRIORITY')                           || define('HIKROBOT_SET_TASK_PRIORITY', 'setTaskPriority');
defined('HIKROBOT_BIND_POD_BERTH')                              || define('HIKROBOT_BIND_POD_BERTH', 'bindPodAndBerth');
defined('HIKROBOT_CTNR_BIN')                                    || define('HIKROBOT_CTNR_BIN', 'bindCtnrAndBin');
defined('HIKROBOT_GEN_PRESCHEDULE_TASK')                        || define('HIKROBOT_GEN_PRESCHEDULE_TASK', 'genPreScheduleTask');
defined('HIKROBOT_CLEAR_ROADWAY')                               || define('HIKROBOT_CLEAR_ROADWAY', 'clearRoadWay');
defined('HIKROBOT_LOCK_POSITION')                               || define('HIKROBOT_LOCK_POSITION', 'lockPosition');
defined('HIKROBOT_STOP_ROBOT')                                  || define('HIKROBOT_STOP_ROBOT', 'stopRobot');
defined('HIKROBOT_SYNC_MAP_DATAS')                              || define('HIKROBOT_SYNC_MAP_DATAS', 'syncMapDatas');
defined('HIKROBOT_BLOCK_AREA')                                  || define('HIKROBOT_BLOCK_AREA', 'blockArea');
defined('HIKROBOT_RESUME_ROBOT')                                || define('HIKROBOT_RESUME_ROBOT', 'resumeRobot');
defined('HIKROBOT_QUERY_AGV_STATUS')                            || define('HIKROBOT_QUERY_AGV_STATUS', 'queryAgvStatus');
defined('HIKROBOT_QUERY_TASK_STATUS')                           || define('HIKROBOT_QUERY_TASK_STATUS', 'queryTaskStatus');
defined('HIKROBOT_QUERY_POD_BERTH_MAT')                         || define('HIKROBOT_QUERY_POD_BERTH_MAT', 'queryPodBerthAndMat');
defined('HIKROBOT_BIND_POD_MAT')                                || define('HIKROBOT_BIND_POD_MAT', 'bindPodAndMat');
defined('HIKROBOT_BLOCK_STG_BIN')                               || define('HIKROBOT_BLOCK_STG_BIN', 'blockStgBin');
defined('HIKROBOT_GET_OUT_POD')                                 || define('HIKROBOT_GET_OUT_POD', 'getOutPod');
defined('HIKROBOT_RETURN_POD')                                  || define('HIKROBOT_RETURN_POD', 'returnPod');
defined('HIKROBOT_GEN_CTU_GROUP_TASK_BATCH')                    || define('HIKROBOT_GEN_CTU_GROUP_TASK_BATCH', 'genCtuGroupTaskBatch');
defined('HIKROBOT_BOX_APPLY_PASS')                              || define('HIKROBOT_BOX_APPLY_PASS', 'boxApplyPass');
defined('HIKROBOT_BIND_MAT_TYPCODE_BERTH')                      || define('HIKROBOT_BIND_MAT_TYPCODE_BERTH', 'bindMaterialTypCodeAndBerth');
defined('HIKROBOT_AGV_CALLBACK')                                || define('HIKROBOT_AGV_CALLBACK', 'agvCallback');
defined('HIKROBOT_WARN_CALLBACK')                               || define('HIKROBOT_WARN_CALLBACK', 'warnCallback');
defined('HIKROBOT_BIND_NOTIFY')                                 || define('HIKROBOT_BIND_NOTIFY', 'bindNotify');
defined('HIKROBOT_APPLY_RETURN_FOR_VALID')                      || define('HIKROBOT_APPLY_RETURN_FOR_VALID', 'applyReturnForValid');
defined('HIKROBOT_APPLY_RETURN_FOR_BIN')                        || define('HIKROBOT_APPLY_RETURN_FOR_BIN', 'applyReturnForBin');

/**
 * Webservices Status Code
 */
defined('HIK_STATUS_SUCCESS')                                   || define('HIK_STATUS_SUCCESS', 0);
defined('HIK_STATUS_FAIL')                                      || define('HIK_STATUS_FAIL', 1);
defined('HIK_STATUS_RESEND')                                    || define('HIK_STATUS_RESEND', 6);
defined('HIK_STATUS_UNKNOWN')                                   || define('HIK_STATUS_UNKNOWN', 99);

/**
 * AMR Statuses
 */
defined('HIKROBOT_TASK_COMPLETED')                              || define('HIKROBOT_TASK_COMPLETED', 1);
defined('HIKROBOT_TASK_EXECUTING')                              || define('HIKROBOT_TASK_EXECUTING', 2);
defined('HIKROBOT_TASK_ABNORMAL')                               || define('HIKROBOT_TASK_ABNORMAL', 3);
defined('HIKROBOT_TASK_IDLE')                                   || define('HIKROBOT_TASK_IDLE', 4);
defined('HIKROBOT_ROBOT_STOPPED')                               || define('HIKROBOT_ROBOT_STOPPED', 5);
defined('HIKROBOT_ROBOT_LIFTING_RACK')                          || define('HIKROBOT_ROBOT_LIFTING_RACK', 6);
defined('HIKROBOT_ROBOT_CHARGING')                              || define('HIKROBOT_ROBOT_CHARGING', 7);
defined('HIKROBOT_ROBOT_CURVE_MOVEMENT')                        || define('HIKROBOT_ROBOT_CURVE_MOVEMENT', 8);
defined('HIKROBOT_ROBOT_FULL_CHARGE_MAINTENANCE')               || define('HIKROBOT_ROBOT_FULL_CHARGE_MAINTENANCE', 9);
defined('HIKROBOT_ROBOT_RACK_NOT_RECOGNIZED')                   || define('HIKROBOT_ROBOT_RACK_NOT_RECOGNIZED', 11);
defined('HIKROBOT_ROBOT_RACK_ANGLE_DEFLECTED')                  || define('HIKROBOT_ROBOT_RACK_ANGLE_DEFLECTED', 12);
defined('HIKROBOT_ROBOT_MOTION_LIB_EXCEPTION')                  || define('HIKROBOT_ROBOT_MOTION_LIB_EXCEPTION', 13);
defined('HIKROBOT_ROBOT_RACK_CODE_UNRECOGNIZABLE')              || define('HIKROBOT_ROBOT_RACK_CODE_UNRECOGNIZABLE', 14);
defined('HIKROBOT_ROBOT_RACK_CODE_MISMATCH')                    || define('HIKROBOT_ROBOT_RACK_CODE_MISMATCH', 15);
defined('HIKROBOT_ROBOT_LIFTING_EXCEPTION')                     || define('HIKROBOT_ROBOT_LIFTING_EXCEPTION', 16);
defined('HIKROBOT_ROBOT_CHARGING_STATION_EXCEPTION')            || define('HIKROBOT_ROBOT_CHARGING_STATION_EXCEPTION', 17);
defined('HIKROBOT_ROBOT_BATTERY_NOT_CHARGING')                  || define('HIKROBOT_ROBOT_BATTERY_NOT_CHARGING', 18);
defined('HIKROBOT_ROBOT_CHARGING_DIRECTION_ERROR')              || define('HIKROBOT_ROBOT_CHARGING_DIRECTION_ERROR', 20);
defined('HIKROBOT_ROBOT_PLATFORM_COMMAND_ERROR')                || define('HIKROBOT_ROBOT_PLATFORM_COMMAND_ERROR', 21);
defined('HIKROBOT_ROBOT_ABNORMAL_UNLOADING')                    || define('HIKROBOT_ROBOT_ABNORMAL_UNLOADING', 23);
defined('HIKROBOT_ROBOT_RACK_POS_DEVIATED')                     || define('HIKROBOT_ROBOT_RACK_POS_DEVIATED', 24);
defined('HIKROBOT_ROBOT_NOT_IN_BLOCK_ZONE')                     || define('HIKROBOT_ROBOT_NOT_IN_BLOCK_ZONE', 25);
defined('HIKROBOT_ROBOT_RETRY_PUTTING_DOWN_FAILED')             || define('HIKROBOT_ROBOT_RETRY_PUTTING_DOWN_FAILED', 26);
defined('HIKROBOT_ROBOT_INCORRECT_RACK_LOC')                    || define('HIKROBOT_ROBOT_INCORRECT_RACK_LOC', 27);
defined('HIKROBOT_ROBOT_LOW_BATTERY_FOR_LIFTING')               || define('HIKROBOT_ROBOT_LOW_BATTERY_FOR_LIFTING', 28);
defined('HIKROBOT_ROBOT_REVERSING_ANGLE_DEFLECTED')             || define('HIKROBOT_ROBOT_REVERSING_ANGLE_DEFLECTED', 29);
defined('HIKROBOT_ROBOT_LIFTING_WITHOUT_RACK')                  || define('HIKROBOT_ROBOT_LIFTING_WITHOUT_RACK', 30);
defined('HIKROBOT_ROBOT_BLOCKING_ZONE_FAILED')                  || define('HIKROBOT_ROBOT_BLOCKING_ZONE_FAILED', 31);
defined('HIKROBOT_ROBOT_ROTATION_REQUEST_TEMP_FAIL')            || define('HIKROBOT_ROBOT_ROTATION_REQUEST_TEMP_FAIL', 33);
defined('HIKROBOT_ROBOT_MAP_SWITCH_CODE_UNRECOGNIZED')          || define('HIKROBOT_ROBOT_MAP_SWITCH_CODE_UNRECOGNIZED', 34);